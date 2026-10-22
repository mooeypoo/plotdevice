// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useEditorStore } from './editor-store'
import { usePaletteStore } from './palette-store'
import { plotDeviceApi } from './plot-device-api'
import { useMenuCommands } from './use-menu-commands'
import { useWorkbenchStore } from './workbench-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'

const Host = defineComponent({
  setup() {
    useMenuCommands()
    return () => null
  }
})

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useMenuCommands', () => {
  it('toggles each panel and focus mode once per event', () => {
    const fake = createFakePlotDeviceApi()
    plotDeviceApi.current = () => fake.api
    const host = mount(Host)

    fake.emitMenuCommand('toggle-binder')
    expect(useWorkbenchNavigation().isAreaOpen('binder')).toBe(false)
    fake.emitMenuCommand('toggle-inspector')
    expect(useWorkbenchNavigation().isAreaOpen('properties')).toBe(false)
    fake.emitMenuCommand('toggle-outline')
    expect(useWorkbenchNavigation().isAreaOpen('properties')).toBe(true)
    expect(useWorkbenchNavigation().isViewChosen('outline')).toBe(true)
    fake.emitMenuCommand('toggle-outline')
    expect(useWorkbenchNavigation().isAreaOpen('properties')).toBe(false)
    fake.emitMenuCommand('toggle-focus-mode')
    expect(useWorkbenchStore().focusMode).toBe(true)
    fake.emitMenuCommand('toggle-focus-mode')
    expect(useWorkbenchStore().focusMode).toBe(false)
    host.unmount()
  })

  it('selects all four views through the navigation queue and stops listening on unmount', async () => {
    const fake = createFakePlotDeviceApi()
    plotDeviceApi.current = () => fake.api
    const host = mount(Host)
    for (const view of ['overview', 'timeline', 'interactions', 'write'] as const) {
      fake.emitMenuCommand(view)
      await useEditorStore().waitForNavigation()
      expect(useWorkbenchStore().centerView).toBe(view)
    }
    host.unmount()
    fake.emitMenuCommand('overview')
    fake.emitMenuCommand('toggle-binder')
    expect(useWorkbenchStore().centerView).toBe('write')
    expect(useWorkbenchNavigation().isAreaOpen('binder')).toBe(true)
  })

  it('opens the command palette', () => {
    const fake = createFakePlotDeviceApi()
    plotDeviceApi.current = () => fake.api
    const host = mount(Host)
    fake.emitMenuCommand('command-palette')
    expect(usePaletteStore().open).toBe(true)
    host.unmount()
  })
})
