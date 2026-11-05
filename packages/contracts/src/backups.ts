import type { ProjectPath, Result } from '@plotdevice/shared'
import { z } from 'zod'
import type { ProjectView } from './project'

// Backups of each book (Milestone 20): a zip into a folder the author chose for that book, once a day
// when it changed. The page names folders and backups only by what the host offered it.

const path = z.string().min(1).max(4096)

/** A clean-up rule the author turned on; `null` keeps every backup (the default). */
export const cleanupRuleSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('older-than'), months: z.number().int().min(1).max(120) }),
    z.strictObject({ kind: z.literal('keep-newest'), count: z.number().int().min(1).max(10_000) }),
  ])
  .nullable()
export const backupFolderSchema = z.strictObject({ folder: path.nullable() })
export const backupFileSchema = z.strictObject({ file: path })
export const backupOfferAnswerSchema = z.strictObject({ folder: path.nullable() })

export type CleanupRuleView = z.infer<typeof cleanupRuleSchema>
export type BackupProblemView = 'missing-folder' | 'no-space' | 'inside-book' | 'failed'

export interface BackupStatusView {
  /** `null` while backups are off for this book. */
  folder: string | null
  cleanup: CleanupRuleView
  lastAt: number | null
  /** The folder chosen for the last book, offered first. */
  suggestedFolder: string | null
  /** Folders on this computer that sync online, offered by name. */
  syncFolders: { name: string; path: string }[]
  problem: BackupProblemView | null
}

export interface BackupEntryView {
  file: string
  name: string
  at: number
  automatic: boolean
}

export interface RestorePreviewView {
  changed: ProjectPath[]
  returning: ProjectPath[]
  newer: ProjectPath[]
}

export type BackupStatusResult = Result<BackupStatusView, 'no-project' | 'not-offered'>
export type BackUpNowResult = Result<{ path: string }, BackupProblemView | 'cancelled' | 'no-project'>
export type ListBackupsResult = Result<BackupEntryView[], 'no-folder' | 'missing-folder' | 'no-project'>
export type PreviewBackupResult = Result<RestorePreviewView, 'unreadable' | 'not-listed' | 'no-project'>
export type RestoreCopyResult = Result<{ root: string }, 'unreadable' | 'not-listed' | 'failed' | 'no-project'>
export type RestoreReplaceResult = Result<
  { project: ProjectView; before: string },
  BackupProblemView | 'unreadable' | 'not-listed' | 'restore-failed' | 'no-project'
>
