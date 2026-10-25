import type { FileStore, ReadProblem, Revision, StoredText, TextToStore, WriteProblem } from '@plotdevice/application'
import { collisionKey, err, ok, type ProjectPath, type Result } from '@plotdevice/shared'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, realpath, rename, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'
import { AtomicWriteError, removeStaleTempFiles, writeAtomically } from './atomic-write'

export interface FileStoreOptions {
  /** Test seam: runs just before a write replaces its file (where an external edit can still land). */
  beforeRename?: (path: ProjectPath) => Promise<void> | void
}

const encoder = new TextEncoder()
const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/**
 * The project's files on disk (ADR 0005): revision-checked writes through the atomic writer, one at a
 * time per file, checked again just before the rename; no reading or writing through symlinks that
 * lead out of the project.
 */
export function createFileStore(root: string, options: FileStoreOptions = {}): FileStore {
  const queues = new Map<string, Promise<unknown>>()
  const absolute = (path: string): string => join(root, ...path.split('/'))
  const encode = (content: TextToStore): Uint8Array => encoder.encode(content.hasBom ? `﻿${content.text}` : content.text)
  const revisionOf = (content: TextToStore): Revision => hash(encode(content))

  async function diskRevision(path: string): Promise<Revision | null> {
    const bytes = await readFile(absolute(path)).catch(() => null)
    return bytes ? hash(bytes) : null
  }

  /** One write or rename at a time per file (case-insensitively), so check and write cannot interleave. */
  function serialized<T>(path: string, task: () => Promise<T>): Promise<T> {
    const key = collisionKey(path)
    const run = (queues.get(key) ?? Promise.resolve()).then(task, task)
    queues.set(key, run.catch(() => undefined))
    return run
  }

  async function insideProject(path: string): Promise<boolean> {
    const realRoot = await realpath(root)
    const target = await realpathOfNearestExisting(absolute(path))
    const rel = relative(realRoot, target)
    return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
  }

  return {
    revisionOf,

    async read(path): Promise<Result<StoredText, ReadProblem>> {
      if (!(await insideProject(path))) return err('outside-project')
      let bytes: Buffer
      try {
        bytes = await readFile(absolute(path))
      } catch (cause) {
        return err((cause as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'io')
      }
      let decoded: string
      try {
        decoded = strictUtf8.decode(bytes)
      } catch {
        return err('not-utf8')
      }
      const hasBom = decoded.startsWith('﻿')
      return ok({ text: hasBom ? decoded.slice(1) : decoded, hasBom, revision: hash(bytes) })
    },

    write(path, content, expected) {
      return serialized(path, async (): Promise<Result<Revision, WriteProblem>> => {
        if (!(await insideProject(path))) return err({ code: 'outside-project' })
        const current = await diskRevision(path)
        if (current !== expected) return err({ code: 'stale', diskRevision: current })
        // The writer wraps errors thrown by the hook, so the late check's outcome is kept here.
        const late: { revision: Revision | null; stale: boolean } = { revision: null, stale: false }
        try {
          await writeAtomically(absolute(path), encode(content), {
            beforeRename: async () => {
              await options.beforeRename?.(path)
              late.revision = await diskRevision(path)
              late.stale = late.revision !== expected
              if (late.stale) throw new Error('changed on disk during the write')
            },
          })
        } catch (cause) {
          if (late.stale) return err({ code: 'stale', diskRevision: late.revision })
          return err({ code: cause instanceof AtomicWriteError ? cause.code : 'io' })
        }
        return ok(revisionOf(content))
      })
    },

    rename(from, to, expected) {
      return serialized(from, async () => {
        if (!(await insideProject(from)) || !(await insideProject(to))) return err('outside-project')
        const current = await diskRevision(from)
        if (current === null) return err('missing')
        if (current !== expected) return err('stale')
        const caseOnly = collisionKey(from) === collisionKey(to)
        if (!caseOnly && (await stat(absolute(to)).catch(() => null))) return err('exists')
        try {
          await mkdir(dirname(absolute(to)), { recursive: true })
          if (caseOnly) {
            // On case-insensitive disks `from` and `to` are the same file; go through a temporary name.
            const temp = `${absolute(from)}.plotdevice-renaming`
            await rename(absolute(from), temp)
            await rename(temp, absolute(to))
          } else await rename(absolute(from), absolute(to))
          return ok(undefined)
        } catch {
          return err('io')
        }
      })
    },

    async listMarkdownFiles() {
      const files: string[] = []
      const walk = async (dir: string, prefix: string): Promise<void> => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          if (entry.name.startsWith('.')) continue
          const path = prefix ? `${prefix}/${entry.name}` : entry.name
          if (entry.isDirectory()) await walk(join(dir, entry.name), path)
          else if (entry.isFile() && /\.md$/i.test(entry.name)) files.push(path)
        }
      }
      await walk(root, '')
      return files.sort() as ProjectPath[]
    },

    async tidy() {
      const visit = async (dir: string): Promise<void> => {
        await removeStaleTempFiles(dir)
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) await visit(join(dir, entry.name))
        }
      }
      await visit(root)
    },
  }
}

function hash(bytes: Uint8Array): Revision {
  return createHash('sha256').update(bytes).digest('hex') as Revision
}

/** The real path of `path`, or of its nearest existing parent joined with the rest (for new files). */
async function realpathOfNearestExisting(path: string): Promise<string> {
  const real = await realpath(path).catch(() => null)
  if (real) return real
  const parent = dirname(path)
  return parent === path ? path : join(await realpathOfNearestExisting(parent), basename(path))
}
