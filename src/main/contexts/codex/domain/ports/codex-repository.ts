import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { LinkCandidate } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import type { CodexWrite } from '../codex-changes'
import type { CodexEntry, CodexKind } from '../codex-entry'
import type { UntypedFile } from '../untyped-file'

/** Everything the codex lists, read from one project. */
export interface CodexFiles {
  readonly entries: readonly CodexEntry[]
  /** Readable files with no `type` or an unknown one. Files that can't be parsed aren't listed. */
  readonly untyped: readonly UntypedFile[]
  /** Every typed file in the project, for unique names and links. */
  readonly linkCandidates: readonly LinkCandidate[]
}

/** A codex entry's frontmatter values and the version they came from. */
export interface CodexEntryFile {
  readonly path: ProjectPath
  readonly kind: CodexKind
  readonly frontmatter: unknown
  readonly version: string
}

/** Why a file couldn't be read. */
export type ReadCodexError = DomainError<'not-found' | 'unreadable'>

/** Why a body couldn't be written. The file is untouched. */
export type WriteCodexTextError = DomainError<
  'changed-on-disk' | 'not-found' | 'unreadable' | 'write-failed'
>

/** Why frontmatter couldn't be written. The file is untouched. */
export type WriteCodexPropertiesError = WriteCodexTextError | DomainError<'cannot-edit'>

/** Why a new file couldn't be created. */
export type CreateCodexFileError = DomainError<'already-exists' | 'write-failed'>

/** Reads and writes one project's characters, locations, and notes. */
export interface CodexRepository {
  load(): Promise<CodexFiles>
  readText(
    path: ProjectPath
  ): Promise<Result<{ readonly text: string; readonly version: string }, ReadCodexError>>
  /** Replaces only the body. `undefined` as the version overwrites whatever is there. */
  writeText(
    path: ProjectPath,
    text: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string }, WriteCodexTextError>>
  /** A file's whole text (frontmatter included), or `undefined` if it can't be read. */
  readFileText(path: ProjectPath): Promise<string | undefined>
  readEntryFile(path: ProjectPath): Promise<Result<CodexEntryFile, ReadCodexError>>
  /** Changes only the given keys (ADR 0004), of any markdown file in the project. */
  writeProperties(
    path: ProjectPath,
    writes: readonly CodexWrite[],
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string }, WriteCodexPropertiesError>>
  createFile(
    path: ProjectPath,
    text: string
  ): Promise<Result<{ readonly version: string }, CreateCodexFileError>>
}
