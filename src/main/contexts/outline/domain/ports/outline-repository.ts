import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import type { OutlineFile } from '../outline-file'

/** The project's outlines, and every file name a new outline must not take. */
export interface OutlineFiles {
  readonly outlines: readonly OutlineFile[]
  /** Every markdown file in the project, typed or not. */
  readonly taken: readonly ProjectPath[]
}

/** Why an outline couldn't be read. */
export type ReadOutlineError = DomainError<'not-found' | 'unreadable'>

/** Why an outline's body couldn't be written. The file is untouched. */
export type WriteOutlineTextError = DomainError<
  'changed-on-disk' | 'not-found' | 'unreadable' | 'write-failed'
>

/** Why a new outline couldn't be created. */
export type CreateOutlineFileError = DomainError<'already-exists' | 'write-failed'>

/** Reads and writes one project's outlines (`type: outline`). */
export interface OutlineRepository {
  load(): Promise<OutlineFiles>
  readText(
    path: ProjectPath
  ): Promise<Result<{ readonly text: string; readonly version: string }, ReadOutlineError>>
  /** Replaces only the body. `undefined` as the version overwrites whatever is there. */
  writeText(
    path: ProjectPath,
    text: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string }, WriteOutlineTextError>>
  createFile(
    path: ProjectPath,
    text: string
  ): Promise<Result<{ readonly version: string }, CreateOutlineFileError>>
}
