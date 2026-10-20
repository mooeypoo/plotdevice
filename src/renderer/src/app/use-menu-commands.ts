import { onBeforeUnmount, onMounted } from 'vue'
import type { AppMenuCommand } from '../../../contract/api'
import { useLayoutStore } from './layout-store'
import { plotDeviceApi } from './plot-device-api'

/** Maps native menu commands onto the open project's layout while it is mounted. */
export function useMenuCommands(): void {
  const layout = useLayoutStore()
  let stopListening: (() => void) | undefined
  const actions: Record<AppMenuCommand, () => void> = {
    'toggle-binder': layout.toggleBinder,
    'toggle-inspector': layout.toggleInspector,
    'toggle-outline': layout.toggleOutline,
    'toggle-focus-mode': layout.toggleFocusMode,
    write: () => {
      layout.mainView = 'write'
    },
    overview: () => {
      layout.mainView = 'overview'
    },
    timeline: () => {
      layout.mainView = 'timeline'
    },
    interactions: () => {
      layout.mainView = 'interactions'
    }
  }
  onMounted(() => {
    stopListening = plotDeviceApi.current().app.onMenuCommand((command) => {
      actions[command]()
    })
  })
  onBeforeUnmount(() => {
    stopListening?.()
  })
}
