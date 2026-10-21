import type { RecentProject } from '../recent-projects'
import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { Result } from '../../../../shared-kernel/result'

/** A settings failure, independent from reading or writing a novel. */
export type RecentProjectsError = DomainError<
  'recents-read-failed' | 'recents-save-failed' | 'recents-invalid'
>

/** Keeps the recents list in the user's settings folder. */
export interface RecentProjectsStore {
  /** A missing settings file is an empty list; invalid or unreadable settings are explicit failures. */
  load(): Promise<Result<readonly RecentProject[], RecentProjectsError>>
  /** Persists a list only after the caller has successfully read the existing settings. */
  save(list: readonly RecentProject[]): Promise<Result<void, RecentProjectsError>>
}
