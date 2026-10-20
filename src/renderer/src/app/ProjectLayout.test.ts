// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { plotDeviceApi } from './plot-device-api'
import ProjectLayout from './ProjectLayout.vue'
import { useWorkspaceStore } from './workspace-store'
import { useWritingPreferencesStore } from './writing-preferences-store'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
})

describe('ProjectLayout writing preferences', () => {
  it('applies live typography to the writing surface and preserves it in focus mode', async () => {
    const wrapper = mount(ProjectLayout, {
      global: {
        stubs: {
          TopBar: true,
          EditorPane: true,
          SidePanel: true,
          RightPanel: true,
          StatusBar: true
        }
      }
    })
    await flushPromises()
    const layout = wrapper.get('.layout').element
    if (!(layout instanceof HTMLElement)) throw new Error('Expected a layout element')
    expect(layout.style.getPropertyValue('--prose-size')).toBe('19px')
    expect(layout.style.getPropertyValue('--measure')).toBe('66ch')
    const preferences = useWritingPreferencesStore()
    preferences.setFontSize(23)
    preferences.setLineWidth(75)
    await wrapper.vm.$nextTick()
    expect(layout.style.getPropertyValue('--prose-size')).toBe('23px')
    expect(layout.style.getPropertyValue('--measure')).toBe('75ch')
    useLayoutStore().toggleFocusMode()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.layout').classes()).toContain('focus')
    expect(layout.style.getPropertyValue('--prose-size')).toBe('23px')
    expect(layout.style.getPropertyValue('--measure')).toBe('75ch')
    wrapper.unmount()
  })
})
