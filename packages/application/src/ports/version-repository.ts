import type { ProjectPath, Result } from '@plotdevice/shared'
import type { Revision } from './file-store'

export interface Versions {
  /** The file as it is now; restoring is refused if it changes before then. */
  revision: Revision
  /** When each earlier version was kept, newest first. */
  versions: number[]
}

/** Earlier versions of a project's files, from the backups (Milestone 6). Implemented by `storage`. */
export interface VersionRepository {
  list(root: string, file: ProjectPath): Promise<Result<Versions, 'missing' | 'unreadable'>>
  read(root: string, file: ProjectPath, at: number): Promise<Result<string, 'missing' | 'unreadable'>>
  /**
   * Puts the version from `at` back, byte for byte, if the file is still at `expected`. What it
   * replaces is kept as a version first, so a restore can itself be undone.
   */
  restore(root: string, file: ProjectPath, at: number, expected: Revision): Promise<Result<void, 'stale' | 'missing' | 'unreadable' | 'write-failed'>>
}
