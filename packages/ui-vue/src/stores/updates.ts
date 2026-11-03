import type { UpdateCheckView, UpdateView } from '@plotdevice/contracts'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../api'

/**
 * Update notices (Milestone 15): a newer version to mention in the top bar, until the author dismisses
 * it, and "Check for updates" in About. Nothing is downloaded; the links open in the browser.
 */
export const useUpdatesStore = defineStore('updates', () => {
  const api = useApi()
  const available = ref<UpdateView | null>(null)
  /** The answer to "Check for updates", shown in About; `checking` while waiting. */
  const checked = ref<UpdateCheckView | { kind: 'checking' } | null>(null)

  void api.getUpdate().then((update) => (available.value ??= update))
  api.onEvent((event) => {
    if (event.kind === 'update-available') available.value = event.update
  })

  async function dismiss(): Promise<void> {
    const version = available.value?.version
    available.value = null
    if (version) await api.dismissUpdate(version)
  }

  async function check(): Promise<void> {
    checked.value = { kind: 'checking' }
    checked.value = await api.checkForUpdates().catch((): UpdateCheckView => ({ kind: 'failed' }))
  }

  return { available, checked, dismiss, check }
})

/** The install page in the interface's language, or English. */
export const downloadFor = (update: UpdateView, locale: string): string => update.download[locale] ?? update.download.en ?? update.notes
