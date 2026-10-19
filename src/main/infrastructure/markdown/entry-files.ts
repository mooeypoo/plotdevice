import { createHash } from 'node:crypto'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { domainError, type DomainError } from '../../shared-kernel/domain-error'
import type { ProjectPath } from '../../shared-kernel/project-path'
import { err, ok, type Result } from '../../shared-kernel/result'
import { toProjectPath } from '../fs/to-project-path'
import { writeFileAtomically } from '../fs/write-text-file-atomically'
import { editFrontmatter, type KeyEdit } from './frontmatter-editor'
import {
  composeMarkdownFile,
  fromEditorText,
  splitMarkdownFile,
  toEditorText,
  type MarkdownFileParts
} from './markdown-file'
import { readFrontmatter } from './read-frontmatter'

/** Why a file couldn't be read. */
export type ReadFileError = DomainError<'not-found' | 'unreadable'>

/** Why a body couldn't be written. The file is untouched in every case. */
export type WriteTextError = DomainError<
  'changed-on-disk' | 'not-found' | 'unreadable' | 'write-failed'
>

/** Why frontmatter couldn't be written. The file is untouched in every case. */
export type WriteFileError = WriteTextError | DomainError<'cannot-edit'>

/** Why a new file couldn't be created. */
export type CreateFileError = DomainError<'already-exists' | 'write-failed'>

/** A file's body as the editor gets it, with the version it came from. */
export interface FileText {
  readonly text: string
  readonly version: string
}

/** A file's frontmatter values, with the version they came from. */
export interface FileFrontmatter {
  readonly frontmatter: unknown
  readonly version: string
}

/**
 * Reads and writes the markdown files of one project with the guarantees of AGENTS.md: a save
 * changes only the body or only the edited keys, refuses a file that changed since `version`
 * (`undefined` writes whatever is there), and never writes a file it can't parse.
 */
export interface EntryFiles {
  readText(path: ProjectPath): Promise<Result<FileText, ReadFileError>>
  writeText(
    path: ProjectPath,
    text: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string }, WriteTextError>>
  readFrontmatter(path: ProjectPath): Promise<Result<FileFrontmatter, ReadFileError>>
  writeKeys(
    path: ProjectPath,
    edits: readonly KeyEdit[],
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string }, WriteFileError>>
  /** Creates a new file, and its folders. Never replaces an existing file. */
  createFile(
    path: ProjectPath,
    text: string
  ): Promise<Result<{ readonly version: string }, CreateFileError>>
}

/** The markdown files of the project at `rootOsPath`. */
export function createEntryFiles(rootOsPath: string): EntryFiles {
  const osPathOf = (path: ProjectPath): string | undefined => {
    const osPath = join(rootOsPath, ...path.split('/'))
    const back = toProjectPath(rootOsPath, osPath)
    return back.ok && back.value === path ? osPath : undefined
  }

  const readBytes = async (
    path: ProjectPath
  ): Promise<Result<{ osPath: string; bytes: Uint8Array }, ReadFileError>> => {
    const osPath = osPathOf(path)
    if (osPath === undefined)
      return err(domainError('not-found', `"${path}" is not in the project.`))
    try {
      return ok({ osPath, bytes: await readFile(osPath) })
    } catch (error) {
      return isMissing(error)
        ? err(domainError('not-found', `"${path}" no longer exists.`))
        : err(domainError('unreadable', `"${path}" can't be read.`))
    }
  }

  /** Reads, checks the version, transforms, and writes atomically if anything changed. */
  const rewrite = async <E>(
    path: ProjectPath,
    expectedVersion: string | undefined,
    transform: (parts: MarkdownFileParts) => Result<Uint8Array, E>
  ): Promise<Result<{ readonly version: string }, WriteTextError | E>> => {
    const read = await readBytes(path)
    if (!read.ok) return read
    const { osPath, bytes } = read.value
    const currentVersion = versionOf(bytes)
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      return err(domainError('changed-on-disk', `"${path}" changed outside Plot Device.`))
    }
    const split = splitMarkdownFile(bytes)
    if (split.kind !== 'parts') {
      return err(domainError('unreadable', `"${path}" can't be written safely (${split.kind}).`))
    }
    const updated = transform(split.parts)
    if (!updated.ok) return updated
    if (Buffer.from(updated.value).equals(Buffer.from(bytes)))
      return ok({ version: currentVersion })
    try {
      await writeFileAtomically(osPath, updated.value)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return err(domainError('write-failed', `Couldn't save "${path}": ${reason}`))
    }
    return ok({ version: versionOf(updated.value) })
  }

  return {
    async readText(path) {
      const read = await readBytes(path)
      if (!read.ok) return read
      const split = splitMarkdownFile(read.value.bytes)
      if (split.kind !== 'parts') {
        return err(domainError('unreadable', `"${path}" can't be read safely (${split.kind}).`))
      }
      return ok({ text: toEditorText(split.parts.body), version: versionOf(read.value.bytes) })
    },

    writeText: (path, text, expectedVersion) =>
      rewrite(path, expectedVersion, (parts) =>
        ok(composeMarkdownFile({ ...parts, body: fromEditorText(text, parts) }))
      ),

    async readFrontmatter(path) {
      const read = await readBytes(path)
      if (!read.ok) return read
      const frontmatter = readFrontmatter(read.value.bytes)
      if (frontmatter.kind !== 'read') {
        return err(
          domainError('unreadable', `"${path}" can't be read safely (${frontmatter.kind}).`)
        )
      }
      return ok({ frontmatter: frontmatter.data, version: versionOf(read.value.bytes) })
    },

    writeKeys: (path, edits, expectedVersion) =>
      rewrite(path, expectedVersion, (parts) => {
        const edited = editFrontmatter(parts, edits)
        return edited.ok
          ? ok(composeMarkdownFile(edited.value))
          : err(domainError('cannot-edit', edited.error.message))
      }),

    async createFile(path, text) {
      const osPath = osPathOf(path)
      if (osPath === undefined)
        return err(domainError('write-failed', `"${path}" is not in the project.`))
      if (await stat(osPath).catch(() => undefined)) {
        return err(domainError('already-exists', `"${path}" already exists.`))
      }
      try {
        await mkdir(dirname(osPath), { recursive: true })
        const bytes = new TextEncoder().encode(text)
        await writeFileAtomically(osPath, bytes)
        return ok({ version: versionOf(bytes) })
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return err(domainError('write-failed', `Couldn't create "${path}": ${reason}`))
      }
    }
  }
}

function versionOf(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
