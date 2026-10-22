// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CenterStage from './CenterStage.vue'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkbenchStore } from './workbench-store'
import { useWorkspaceStore } from './workspace-store'

// Markers stand in for the registered views, so this tests where the stage puts them.
vi.mock('../workbench/views/view-registry', async () => {
  const { defineComponent, h } = await import('vue')
  const marker = (name: string) =>
    defineComponent({ render: () => h('div', { class: `marker ${name}` }) })
  const registry = {
    document: {
      component: defineComponent(
        (_, { slots }) =>
          () =>
            h('div', { class: 'marker document' }, slots.default?.())
      )
    },
    warnings: { component: marker('warnings') },
    cast: { component: marker('cast') },
    timeline: { component: marker('timeline') }
  }
  return {
    VIEW_REGISTRY: registry,
    PROJECT_HOME: marker('home'),
    registeredView: (id: keyof typeof registry) => registry[id]
  }
})

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await useManuscriptStore().load()
})

describe('CenterStage strip above the page', () => {
  it('shows the cast above an open document, and hides it on request', async () => {
    const stage = mount(CenterStage)
    expect(stage.find('.marker.cast').exists()).toBe(false)
    await useEditorStore().open('The Ferry.md')
    await flushPromises()
    expect(stage.find('.above .marker.cast').exists()).toBe(true)
    expect(stage.find('.marker.document').exists()).toBe(true)
    await stage.get('.above .hide').trigger('click')
    expect(useWorkbenchStore().layout.center.above).toBeNull()
    expect(stage.find('.marker.cast').exists()).toBe(false)
    await useEditorStore().flush()
  })

  it('leaves it out of other views, focus mode and the classic shell', async () => {
    const stage = mount(CenterStage)
    await useEditorStore().open('The Ferry.md')
    const layout = useLayoutStore()
    layout.focusMode = true
    await flushPromises()
    expect(stage.find('.marker.cast').exists()).toBe(false)
    layout.focusMode = false
    useWorkbenchStore().setShell('classic')
    await flushPromises()
    expect(stage.find('.marker.cast').exists()).toBe(false)
    useWorkbenchStore().setShell('workbench')
    layout.mainView = 'timeline'
    await flushPromises()
    expect(stage.find('.marker.cast').exists()).toBe(false)
    expect(stage.find('.marker.timeline').exists()).toBe(true)
    await useEditorStore().flush()
  })
})
