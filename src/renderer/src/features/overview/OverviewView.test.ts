// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useInspectorStore } from '../../app/inspector-store'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useWorkspaceStore } from '../../app/workspace-store'
import OverviewView from './OverviewView.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([
    useManuscriptStore().load(),
    useCodexStore().load(),
    useInspectorStore().loadVocabulary()
  ])
})

describe('OverviewView', () => {
  it('lists chapters by part with status, POV, and thread names', () => {
    const view = mount(OverviewView)
    expect(view.text()).toContain('Part I')
    expect(view.text()).toContain('The Ferry')
    expect(view.text()).toContain('Ilka')
    expect(view.text()).toContain('Main plot')
  })

  it('filters, and says how many of a part’s chapters match', async () => {
    const view = mount(OverviewView)
    const [, pov] = view.findAll('select')
    await pov?.setValue('Ilka')
    expect(view.text()).toContain('1 of 2')
    expect(view.text()).not.toContain('First frost')
    const clear = view.findAll('button').find((button) => button.text() === 'Clear filters')
    await clear?.trigger('click')
    expect(view.text()).toContain('First frost')
  })

  it('edits a synopsis in place, writing only that key', async () => {
    const view = mount(OverviewView)
    const cell = view.findAll('button.show').find((button) => button.text() === 'Add a synopsis…')
    await cell?.trigger('click')
    const box = view.get('textarea')
    await box.setValue('The ferry docks.')
    await box.trigger('blur')
    await flushPromises()
    expect(fake.properties.get('The Ferry.md')?.synopsis).toBe('The ferry docks.')
  })

  it('opens a chapter to write, leaving the Overview', async () => {
    const layout = useLayoutStore()
    layout.mainView = 'overview'
    const view = mount(OverviewView)
    const title = view.findAll('button.open').find((button) => button.text() === 'First frost')
    await title?.trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('First frost.md')
    expect(layout.mainView).toBe('write')
  })
})
