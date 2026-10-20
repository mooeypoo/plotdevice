import type { DomainError } from '../shared-kernel/domain-error'
import type { ProjectPath } from '../shared-kernel/project-path'
import type { Result } from '../shared-kernel/result'

/** A refused recovery never changes the source file. */
export type RecoveryError = DomainError<
  'snapshot-unavailable' | 'read-only' | 'write-failed' | 'cannot-edit'
>

/** An in-memory, project-scoped snapshot of the open draft's last safely read metadata. */
export interface RecoverySession {
  capture(path: ProjectPath, version: string): Result<string, RecoveryError>
  saveCopy(token: string, text: string): Promise<Result<{ path: ProjectPath }, RecoveryError>>
}

/** Records the exact bytes behind a successful file read or write for later explicit recovery. */
export type RememberEntryBytes = (path: ProjectPath, version: string, bytes: Uint8Array) => void
