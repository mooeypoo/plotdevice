import type { Result } from '@plotdevice/shared'

export type AppDataWriteFailure = 'read-only' | 'locked' | 'io'

/** One file of the author's personal state in OS app data (settings, recent projects). Implemented by `fs-node`. */
export interface AppDataFile {
  /** The saved text, or `null` when nothing has been saved yet. */
  read(): Promise<string | null>
  write(text: string): Promise<Result<void, AppDataWriteFailure>>
  /** Moves an unreadable file aside so it is never silently lost. */
  setAside(): Promise<void>
}
