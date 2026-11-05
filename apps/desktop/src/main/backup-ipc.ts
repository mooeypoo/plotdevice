import type { BackupSession, BackupStatus, RecentProjectsSession, WritingSession } from '@plotdevice/application'
import {
  backupFileSchema,
  backupFolderSchema,
  backupOfferAnswerSchema,
  channels,
  cleanupRuleSchema,
  type BackUpNowResult,
  type BackupStatusResult,
  type BackupStatusView,
  type ListBackupsResult,
  type PreviewBackupResult,
  type RestoreCopyResult,
  type RestoreReplaceResult,
} from '@plotdevice/contracts'
import { err, ok } from '@plotdevice/shared'
import { IpcRefused, parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'
import { projectView } from './views'

export interface BackupIpcContext {
  backups: BackupSession
  writing: WritingSession
  recent: RecentProjectsSession
  /** The native folder picker, starting at `start`; `null` when the author cancels. */
  chooseFolder(start: string | null): Promise<string | null>
  syncFolders(): Promise<{ name: string; path: string }[]>
  /** Shows a folder in the system's file manager. */
  showFolder(path: string): Promise<void>
  /** The author answered the backup offer: a window waiting to close may close now. */
  offerAnswered(): void
  /** Saves an automatic backup if one is due, and tells the page if something needs saying. */
  runBackups(): Promise<void>
}

/**
 * Backups of each book (Milestone 20). The page can only name a folder the host offered (chosen in the
 * picker, found as a sync folder, or used before) and a backup the host listed, so it can't make the
 * app write or read anywhere else.
 */
export function createBackupHandlers(context: BackupIpcContext): Record<string, PayloadHandler> {
  const { backups, writing } = context
  const offered = new Set<string>()
  const offer = (folder: string | null): string | null => {
    if (folder !== null) offered.add(folder)
    return folder
  }

  const view = async (status: BackupStatus): Promise<BackupStatusView> => {
    const syncFolders = await context.syncFolders()
    for (const folder of syncFolders) offer(folder.path)
    offer(status.folder)
    offer(status.suggestedFolder)
    return { ...status, syncFolders }
  }

  const statusResult = async (): Promise<BackupStatusResult> => {
    const status = await backups.status()
    return status ? ok(await view(status)) : err('no-project')
  }

  return {
    [channels.backupStatus]: statusResult,

    [channels.chooseBackupFolder]: async (): Promise<string | null> => {
      const status = await backups.status()
      return offer(await context.chooseFolder(status?.folder ?? status?.suggestedFolder ?? null))
    },

    [channels.setBackupFolder]: async (payload): Promise<BackupStatusResult> => {
      const { folder } = parsePayload(backupFolderSchema, payload)
      if (folder !== null && !offered.has(folder)) return err('not-offered')
      const set = await backups.setFolder(folder)
      if (!set.ok) return set
      // The first backup at once, so the author sees it work.
      if (folder !== null) await context.runBackups()
      return statusResult()
    },

    [channels.setBackupCleanup]: async (payload): Promise<BackupStatusResult> => {
      const set = await backups.setCleanup(parsePayload(cleanupRuleSchema, payload))
      return set.ok ? ok(await view(set.value)) : set
    },

    [channels.backUpNow]: async (): Promise<BackUpNowResult> => {
      const status = await backups.status()
      if (!status) return err('no-project')
      let folder: string | undefined
      if (status.folder === null) {
        const chosen = offer(await context.chooseFolder(status.suggestedFolder))
        if (chosen === null) return err('cancelled')
        folder = chosen
      }
      const saved = await backups.backUpNow(folder)
      if (saved.ok) return ok({ path: saved.value })
      return err(saved.error === 'no-folder' ? 'cancelled' : saved.error)
    },

    [channels.openBackupFolder]: async () => {
      const status = await backups.status()
      if (status?.folder) await context.showFolder(status.folder)
    },

    [channels.listBackups]: (): Promise<ListBackupsResult> => backups.list(),

    [channels.previewBackup]: async (payload): Promise<PreviewBackupResult> =>
      backups.preview(parsePayload(backupFileSchema, payload).file),

    [channels.restoreBackupAsCopy]: async (payload): Promise<RestoreCopyResult> => {
      const project = writing.project()
      const copy = await backups.restoreAsCopy(parsePayload(backupFileSchema, payload).file)
      if (!copy.ok) return copy
      // In Recent projects, so the page can open it like any book the author has opened before.
      await context.recent.opened({ root: copy.value, title: project?.details.title ?? copy.value })
      return ok({ root: copy.value })
    },

    [channels.restoreBackupReplace]: async (payload): Promise<RestoreReplaceResult> => {
      const replaced = await backups.restoreReplace(parsePayload(backupFileSchema, payload).file)
      return replaced.ok ? ok({ project: projectView(replaced.value.snapshot), before: replaced.value.before }) : replaced
    },

    [channels.shouldOfferBackups]: () => backups.shouldOffer(),

    [channels.answerBackupOffer]: async (payload) => {
      const { folder } = parsePayload(backupOfferAnswerSchema, payload)
      if (folder !== null && !offered.has(folder)) throw new IpcRefused('not-offered')
      if (folder === null) await backups.offered()
      else {
        await backups.setFolder(folder)
        await context.runBackups()
      }
      context.offerAnswered()
    },
  }
}
