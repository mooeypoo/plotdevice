import type { Result } from '@plotdevice/shared'

export type PreferencesWriteFailure = 'read-only' | 'locked' | 'io'

/** Where the author's personal settings are kept (OS app data on the desktop). Implemented by `fs-node`. */
export interface PreferencesStore {
  /** The saved settings as text, or `null` when nothing has been saved yet. */
  read(): Promise<string | null>
  write(text: string): Promise<Result<void, PreferencesWriteFailure>>
  /** Moves an unreadable settings file aside so it is never silently lost. */
  setAside(): Promise<void>
}
