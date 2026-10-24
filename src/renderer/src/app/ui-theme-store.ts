import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import type { UiTheme } from '../../../contract/dtos'
import { plotDeviceApi } from './plot-device-api'

/**
 * The app's theme, as the writer chose it. The main process applies it to the window, so the
 * page's `prefers-color-scheme` (and every token in global.css) follows on its own.
 */
export const useUiThemeStore = defineStore('ui-theme', () => {
  const theme = ref<UiTheme>('system')
  const saveFailed = ref(false)

  async function initialize(): Promise<void> {
    theme.value = await plotDeviceApi.current().uiTheme.get()
  }

  async function change(next: UiTheme): Promise<void> {
    const result = await plotDeviceApi.current().uiTheme.set(next)
    saveFailed.value = !result.ok
    if (result.ok) theme.value = result.value
    else console.error('The theme could not be saved.', result.error)
  }

  return { theme, saveFailed, initialize, change }
})

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useUiThemeStore, import.meta.hot))
