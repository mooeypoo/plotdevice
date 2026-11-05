import type { ProjectPath, Result } from '@plotdevice/shared'

/** Why a backup couldn't be saved; each has its own plain message. */
export type BackupProblem = 'missing-folder' | 'no-space' | 'inside-book' | 'failed'

/** A zip in a backup folder. */
export interface BackupFileInfo {
  /** Its full path. */
  file: string
  name: string
  modifiedAt: number
}

/** A backup's Markdown files, as the book's own files would read; other files are left out. */
export interface BackupContents {
  files: { path: ProjectPath; text: string; hasBom: boolean }[]
}

/**
 * Backups as zip files in folders the author chose (Milestone 20). Implemented by `fs-node`. A backup
 * is written under a temporary name and renamed when complete, so a half-written one never shows.
 */
export interface BookBackups {
  /** Zips the book folder `root` into `folder` as `name`; returns the zip's path. Never replaces a file. */
  save(root: string, folder: string, name: string): Promise<Result<string, BackupProblem>>
  /** The zips in `folder`, by name. */
  list(folder: string): Promise<Result<BackupFileInfo[], 'missing-folder'>>
  read(file: string): Promise<Result<BackupContents, 'unreadable'>>
  /** Unpacks a backup into a new folder `name` inside `location`, never over anything; returns its path. */
  unpack(file: string, location: string, name: string): Promise<Result<string, 'exists' | 'unreadable' | 'failed'>>
  /** Removes one zip: only ever a backup the app recorded making. */
  remove(file: string): Promise<boolean>
  folderExists(folder: string): Promise<boolean>
}
