// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useEditorStore } from './editor-store'
import { useLayoutStore } from './layout-store'
import { plotDeviceApi } from './plot-device-api'
import { useMenuCommands } from './use-menu-commands'

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
    const layout = useLayoutStore()

    fake.emitMenuCommand('toggle-binder')
    expect(layout.binderOpen).toBe(false)
    fake.emitMenuCommand('toggle-inspector')
    expect(layout.inspectorOpen).toBe(false)
    fake.emitMenuCommand('toggle-outline')
    expect(layout.inspectorOpen).toBe(true)
    expect(layout.rightTab).toBe('outline')
    fake.emitMenuCommand('toggle-outline')
    expect(layout.inspectorOpen).toBe(false)
    fake.emitMenuCommand('toggle-focus-mode')
    expect(layout.focusMode).toBe(true)
    fake.emitMenuCommand('toggle-focus-mode')
    expect(layout.focusMode).toBe(false)
    host.unmount()
  })

  it('selects all four views through the navigation queue and stops listening on unmount', async () => {
    const fake = createFakePlotDeviceApi()
    plotDeviceApi.current = () => fake.api
    const host = mount(Host)
    const layout = useLayoutStore()
    for (const view of ['overview', 'timeline', 'interactions', 'write'] as const) {
      fake.emitMenuCommand(view)
      await useEditorStore().waitForNavigation()
      expect(layout.mainView).toBe(view)
    }
    host.unmount()
    fake.emitMenuCommand('overview')
    fake.emitMenuCommand('toggle-binder')
    expect(layout.mainView).toBe('write')
    expect(layout.binderOpen).toBe(true)
  })
})
