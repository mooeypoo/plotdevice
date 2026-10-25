import type { ProjectPath, Result } from '@plotdevice/shared'
import type { TextToStore } from './file-store'

export interface BackupEntry {
  /** When the backup was taken, in milliseconds since 1970 (UTC). Unique per file. */
  at: number
}

/**
 * Earlier versions of a project's files, kept in OS app data, never in the project (ADR 0005, point 9;
 * Milestone 6). A backup is the file exactly as it was: the same text, byte-order mark and line endings.
 */
export interface BackupStore {
  save(project: string, file: ProjectPath, content: TextToStore, at: number): Promise<Result<void, 'io'>>
  /** Newest first. */
  list(project: string, file: ProjectPath): Promise<BackupEntry[]>
  read(project: string, file: ProjectPath, at: number): Promise<Result<TextToStore, 'missing' | 'unreadable'>>
  remove(project: string, file: ProjectPath, at: readonly number[]): Promise<void>
}
