import type { PlotDeviceApi, Preferences, PreferencesPatch } from '@plotdevice/contracts'
import { ref, type Ref } from 'vue'

/** The author's settings as reactive state, saved through the host. A failed save is reported, not hidden. */
export function usePreferences(api: PlotDeviceApi): {
  preferences: Ref<Preferences | null>
  saveFailed: Ref<boolean>
  update: (patch: PreferencesPatch) => Promise<void>
} {
  const preferences = ref<Preferences | null>(null)
  const saveFailed = ref(false)
  void api.getPreferences().then((loaded) => (preferences.value = loaded))

  async function update(patch: PreferencesPatch): Promise<void> {
    if (!preferences.value) return
    // Apply at once so the interface responds immediately; the host confirms what was saved.
    preferences.value = { ...preferences.value, ...patch } as Preferences
    try {
      preferences.value = await api.setPreferences(patch)
      saveFailed.value = false
    } catch {
      saveFailed.value = true
    }
  }

  return { preferences, saveFailed, update }
}
