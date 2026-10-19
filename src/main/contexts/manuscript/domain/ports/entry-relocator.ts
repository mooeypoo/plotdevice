import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'

/** The links a move or rename updates (or would update) in other files. */
export interface LinkUpdates {
  readonly changedFiles: readonly ProjectPath[]
  readonly linkCount: number
  /** Files that seem to link to the entry but couldn't be updated safely; left untouched. */
  readonly skipped: readonly ProjectPath[]
}

/** Why a file couldn't be moved. Nothing was changed. */
export type RelocateError = DomainError<'already-exists' | 'move-failed'>

/** Moves or renames a file and updates every link to it across the project. */
export interface EntryRelocator {
  /** What `relocate` would change, without writing anything. */
  preview(from: ProjectPath, to: ProjectPath): Promise<LinkUpdates>
  relocate(from: ProjectPath, to: ProjectPath): Promise<Result<LinkUpdates, RelocateError>>
}
