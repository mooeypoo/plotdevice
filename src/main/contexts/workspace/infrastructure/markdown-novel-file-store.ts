import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { domainError } from '../../../shared-kernel/domain-error'
import { err, ok } from '../../../shared-kernel/result'
import { writeTextFileAtomically } from '../../../infrastructure/fs/write-text-file-atomically'
import { readFrontmatter } from '../../../infrastructure/markdown/read-frontmatter'
import type { NovelFileReading, NovelFileStore } from '../domain/ports/novel-file-store'

const NOVEL_FILE = 'novel.md'

/** Reads and creates novel.md on the real file system. */
export function createMarkdownNovelFileStore(): NovelFileStore {
  return {
    read: async (root) => {
      let bytes: Uint8Array
      try {
        bytes = await readFile(join(root, NOVEL_FILE))
      } catch (error) {
        return isMissing(error) ? { kind: 'missing' } : unreadable('unreadable-file')
      }

      const reading = readFrontmatter(bytes)
      switch (reading.kind) {
        case 'read':
          return { kind: 'read', frontmatter: reading.data }
        case 'none':
          return { kind: 'read', frontmatter: undefined }
        case 'invalid-encoding':
          return unreadable('invalid-encoding')
        case 'unclosed':
          return unreadable('unclosed-frontmatter')
        case 'unparseable':
          return unreadable('unparseable-frontmatter')
      }
    },

    create: async (root, text) => {
      const osPath = join(root, NOVEL_FILE)
      if (await stat(osPath).catch(() => undefined)) {
        return err(
          domainError('already-exists', 'This folder already has a novel.md.', {
            reason: 'workspace-already-project',
            path: root
          })
        )
      }
      try {
        await writeTextFileAtomically(osPath, text)
        return ok(undefined)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return err(
          domainError('write-failed', `Couldn't write novel.md: ${reason}`, {
            reason: 'file-create-failed',
            path: osPath,
            detail: reason
          })
        )
      }
    }
  }
}

function unreadable(
  problem: Extract<NovelFileReading, { kind: 'unreadable' }>['problem']
): NovelFileReading {
  return { kind: 'unreadable', problem }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
