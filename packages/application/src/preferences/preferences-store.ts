import type { AppDataFile, AppDataWriteFailure } from '../ports/app-data-file'

export type PreferencesWriteFailure = AppDataWriteFailure

/** Where the author's personal settings are kept. */
export type PreferencesStore = AppDataFile
