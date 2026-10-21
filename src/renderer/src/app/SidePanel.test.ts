// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'
import { useWorkspaceStore } from './workspace-store'
import SidePanel from './SidePanel.vue'
import { isolate } from '../shared/isolate'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
  await useEditorStore().open('The Ferry.md')
})

describe('reference navigation from lists', () => {
  it('opens characters in reference with a separate editor action and selected state', async () => {
    useLayoutStore().sideTab = 'codex'
    const wrapper = mount(SidePanel, { props: { attentionCount: 0 } })
    const character = wrapper.get('.characters .row')
    expect(character.find('.meta').text()).toContain('lead')
    expect(character.find('.meta').classes()).toContain('subtitle')
    await character.trigger('click')
    await flushPromises()
    expect(useReferenceStore().entry?.path).toBe('characters/Ilka.md')
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    expect(character.attributes('aria-current')).toBe('true')
    await wrapper.get(`button[aria-label="Open ${isolate('Ilka')} in editor"]`).trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('characters/Ilka.md')
    const revision = useEditorStore().entry?.revision
    await wrapper.get(`button[aria-label="Open ${isolate('Ilka')} in editor"]`).trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.revision).toBe(revision)
    wrapper.unmount()
  })

  it('offers chapter references without changing normal binder navigation', async () => {
    const wrapper = mount(SidePanel, { props: { attentionCount: 0 } })
    await wrapper
      .get(`button[aria-label="Open ${isolate('First frost')} in reference"]`)
      .trigger('click')
    await flushPromises()
    expect(useReferenceStore().entry?.path).toBe('First frost.md')
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    const chapter = wrapper.findAll('.row').find((row) => row.text().includes('First frost'))
    await chapter?.trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('First frost.md')
    wrapper.unmount()
  })
})
