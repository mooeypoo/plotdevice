// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resizeSplit } from '../workbench/model/operations'
import CenterStage from './CenterStage.vue'
import { useUiLanguageStore } from './ui-language-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkbenchStore } from './workbench-store'
import { useWorkspaceStore } from './workspace-store'

// Markers stand in for the registered views, so this tests where the stage puts them.
vi.mock('../workbench/views/view-registry', async () => {
  const { h } = await import('vue')
  // Functional components: each renders a marker, and the document passes its slot through.
  const marker = (name: string) => () => h('div', { class: `marker ${name}` })
  const registry = {
    document: {
      component: (_: unknown, { slots }: { slots: { default?: () => unknown } }) =>
        h('div', { class: 'marker document' }, slots.default?.() as never)
    },
    warnings: { component: marker('warnings') },
    cast: { component: marker('cast') },
    timeline: { component: marker('timeline') }
  }
  return {
    VIEW_REGISTRY: registry,
    PROJECT_HOME: marker('home'),
    SPLIT_PANE: marker('split'),
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

  it('leaves it out of other views and focus mode', async () => {
    const stage = mount(CenterStage)
    await useEditorStore().open('The Ferry.md')
    useWorkbenchStore().focusMode = true
    await flushPromises()
    expect(stage.find('.marker.cast').exists()).toBe(false)
    useWorkbenchStore().focusMode = false
    useWorkbenchStore().centerView = 'timeline'
    await flushPromises()
    expect(stage.find('.marker.cast').exists()).toBe(false)
    expect(stage.find('.marker.timeline').exists()).toBe(true)
    await useEditorStore().flush()
  })
})

describe('CenterStage splits', () => {
  it('sizes splits as a share of the stage and resizes them from their inline-start edge', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 1000)
    const workbench = useWorkbenchStore()
    workbench.openBeside('First frost.md')
    const stage = mount(CenterStage)
    await flushPromises()
    const slot = stage.get('.split-slot')
    expect(slot.attributes('style')).toContain('inline-size: 500px')
    await slot.get('[role=separator]').trigger('keydown', { key: 'ArrowLeft' })
    expect(workbench.layout.center.splits[0]?.share).toBeCloseTo(0.52)
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    await slot.get('[role=separator]').trigger('keydown', { key: 'ArrowLeft' })
    expect(workbench.layout.center.splits[0]?.share).toBeCloseTo(0.5)
  })

  it('keeps the page readable when splits would crowd it', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 600)
    const workbench = useWorkbenchStore()
    workbench.openBeside('First frost.md')
    workbench.apply((layout) => resizeSplit(layout, layout.center.splits[0]?.id ?? '', 0.8))
    const stage = mount(CenterStage)
    await flushPromises()
    // 600px stage, 280px page minimum: the split shrinks to 320px.
    expect(stage.get('.split-slot').attributes('style')).toContain('inline-size: 320px')
  })

  it('hides splits outside the document view and in the classic shell', async () => {
    const workbench = useWorkbenchStore()
    workbench.openBeside('First frost.md')
    const stage = mount(CenterStage)
    await flushPromises()
    expect(stage.findAll('.split-slot')).toHaveLength(1)
    useWorkbenchStore().centerView = 'timeline'
    await flushPromises()
    expect(stage.findAll('.split-slot')).toHaveLength(0)
    useWorkbenchStore().centerView = 'write'
    await flushPromises()
    expect(stage.findAll('.split-slot')).toHaveLength(1)
  })
})
