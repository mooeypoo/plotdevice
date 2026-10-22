import { onBeforeUnmount, onMounted } from 'vue'
import type { AppMenuCommand } from '../../../contract/api'
import { useLayoutStore } from './layout-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore } from './workbench-store'

/** Maps native menu commands onto the open project's layout while it is mounted. */
export function useMenuCommands(): void {
  const layout = useLayoutStore()
  const navigation = useWorkbenchNavigation()
  const workbench = useWorkbenchStore()
  let stopListening: (() => void) | undefined
  const actions: Record<AppMenuCommand, () => void> = {
    'toggle-binder': layout.toggleBinder,
    'toggle-inspector': layout.toggleInspector,
    'toggle-outline': layout.toggleOutline,
    'toggle-focus-mode': layout.toggleFocusMode,
    'toggle-classic-layout': () => {
      workbench.setShell(workbench.shell === 'classic' ? 'workbench' : 'classic')
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
