// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useReferenceStore } from '../../app/reference-store'
import ReferencePanel from './ReferencePanel.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  fake.files.set('characters/Ilka.md', '## History\n\n**Ilka** came from [[Marrow]].')
  await Promise.all([useCodexStore().load(), useManuscriptStore().load()])
  await useEditorStore().open('The Ferry.md')
})

describe('ReferencePanel', () => {
  it('shows a rendered profile and navigates its links only within the reference', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    expect(wrapper.get('h2').text()).toBe('Ilka')
    expect(wrapper.get('.role').text()).toBe('lead')
    expect(wrapper.get('.aliases').text()).toContain('Ilk')
    expect(wrapper.get('.view h2').text()).toBe('History')
    expect(wrapper.get('strong').text()).toBe('Ilka')
    expect(wrapper.get('.file-path').text()).toBe('characters/Ilka.md')
    await wrapper.get('.view a').trigger('click')
    await flushPromises()
    expect(reference.entry?.path).toBe('locations/Marrow.md')
    expect(wrapper.get('.view').text()).toContain('village')
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    wrapper.unmount()
  })

  it('opens raw Markdown only on request and previews current editor text without another writer', async () => {
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('characters/Ilka.md')
    expect(useLayoutStore().rightTab).toBe('properties')
    useEditorStore().edit('## Revised history\n\nA new draft.')
    await flushPromises()
    expect(wrapper.get('.view h2').text()).toBe('Revised history')
    expect(wrapper.text()).toContain('Showing the current editor draft')
    await useEditorStore().flush()
    wrapper.unmount()
  })

  it('keeps references readable during conflicts and explains blocked editor navigation', async () => {
    const editor = useEditorStore()
    editor.edit('Unsaved manuscript.')
    editor.saveState = 'conflict'
    useReferenceStore().open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    expect(wrapper.get('.view').text()).toContain('History')
    await wrapper.get('.edit').trigger('click')
    await flushPromises()
    expect(editor.entry?.path).toBe('The Ferry.md')
    expect(wrapper.get('[role=alert]').text()).toContain('Resolve')
    wrapper.unmount()
  })

  it('restores per-reference scroll across character switches and panel remounts', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    const scroller = wrapper.get('.reference-panel').element
    scroller.scrollTop = 125
    await wrapper.get('.reference-panel').trigger('scroll')
    reference.open('locations/Marrow.md')
    await flushPromises()
    expect(scroller.scrollTop).toBe(0)
    scroller.scrollTop = 45
    await wrapper.get('.reference-panel').trigger('scroll')
    reference.open('characters/Ilka.md')
    await flushPromises()
    expect(scroller.scrollTop).toBe(125)
    wrapper.unmount()
    const restored = mount(ReferencePanel)
    await flushPromises()
    expect(restored.get('.reference-panel').element.scrollTop).toBe(125)
    restored.unmount()
  })

  it('re-reads a reference after it was edited while the panel was hidden', async () => {
    const reference = useReferenceStore()
    reference.open('characters/Ilka.md')
    const wrapper = mount(ReferencePanel)
    await flushPromises()
    wrapper.unmount()
    await useEditorStore().open('characters/Ilka.md')
    useEditorStore().edit('## A changed history\n\nWritten while Reference was hidden.')
    await useEditorStore().open('The Ferry.md')
    const restored = mount(ReferencePanel)
    await flushPromises()
    expect(restored.get('.view h2').text()).toBe('A changed history')
    expect(restored.text()).not.toContain('Showing the current editor draft')
    restored.unmount()
  })
})
