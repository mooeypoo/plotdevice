import { onBeforeUnmount, onMounted } from 'vue'
import type { AppMenuCommand } from '../../../contract/api'
import { usePaletteStore } from './palette-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore } from './workbench-store'

/** Maps native menu commands onto the open project's layout while it is mounted. */
export function useMenuCommands(): void {
  const navigation = useWorkbenchNavigation()
  const workbench = useWorkbenchStore()
  const palette = usePaletteStore()
  let stopListening: (() => void) | undefined
  const actions: Record<AppMenuCommand, () => void> = {
    'toggle-binder': () => {
      navigation.toggleArea('binder')
    },
    'toggle-inspector': () => {
      navigation.toggleArea('properties')
    },
    'toggle-outline': () => {
      navigation.toggleView('outline')
    },
    'toggle-focus-mode': () => {
      workbench.toggleFocusMode()
    },
    'command-palette': () => {
      palette.show()
    },
    write: () => void navigation.showCenterView('write'),
    overview: () => void navigation.showCenterView('overview'),
    timeline: () => void navigation.showCenterView('timeline'),
    interactions: () => void navigation.showCenterView('interactions')
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
