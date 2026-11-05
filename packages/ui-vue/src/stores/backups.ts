import type { BackupStatusView, CleanupRuleView } from '@plotdevice/contracts'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../api'
import { beforeLeavingBook } from '../closing'
import { useProjectStore } from './project'

/**
 * The open book's backups (Milestone 20): its folder, the last backup, the author's clean-up rule; the
 * "Backups…" and "Restore" dialogs; and the one-time offer, made when the author leaves a book that
 * has some content.
 */
export const useBackupsStore = defineStore('backups', () => {
  const api = useApi()
  const project = useProjectStore()
  const status = ref<BackupStatusView | null>(null)
  const dialog = ref(false)
  const restoring = ref(false)
  /** The offer on screen, and what to do once the author answers. */
  const offer = ref<{ answered: () => void } | null>(null)

  async function refresh(): Promise<void> {
    const result = await api.backupStatus()
    status.value = result.ok ? result.value : null
  }

  async function setFolder(folder: string | null): Promise<void> {
    const result = await api.setBackupFolder(folder)
    if (result.ok) status.value = result.value
    if (result.ok && folder !== null && result.value.problem === null) project.tell('backups-on', result.value.folder ?? '')
  }

  async function choose(): Promise<void> {
    const folder = await api.chooseBackupFolder()
    if (folder) await setFolder(folder)
  }

  async function setCleanup(rule: CleanupRuleView): Promise<void> {
    const result = await api.setBackupCleanup(rule)
    if (result.ok) status.value = result.value
  }

  async function backUpNow(): Promise<void> {
    const made = await api.backUpNow()
    if (made.ok) project.tell('backup-saved', made.value.path)
    else if (made.error !== 'cancelled') project.tell(`backup-problem-${made.error === 'no-project' ? 'failed' : made.error}`)
    await refresh()
  }

  /** Shows the offer and waits for the answer; the answer goes to the host, which may be waiting to close. */
  async function ask(): Promise<void> {
    await refresh()
    await new Promise<void>((answered) => (offer.value = { answered }))
  }

  async function answer(folder: string | null): Promise<void> {
    const waiting = offer.value
    offer.value = null
    await api.answerBackupOffer(folder)
    waiting?.answered()
  }

  beforeLeavingBook.add(async () => {
    if (await api.shouldOfferBackups()) await ask()
  })

  api.onEvent((event) => {
    if (event.kind === 'offer-backups') void ask()
    else if (event.kind === 'backup-ran') {
      if (event.problem) project.tell(`backup-problem-${event.problem}`, event.title)
      else if (event.removed > 0) project.tell('backups-removed', String(event.removed), event.title)
      void refresh()
    }
  })

  return { status, dialog, restoring, offer, refresh, setFolder, choose, setCleanup, backUpNow, answer }
})
