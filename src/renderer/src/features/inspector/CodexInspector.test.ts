// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import CodexInspector from './CodexInspector.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

describe('CodexInspector', () => {
  it('shows a character’s profile and where it appears, and opens a chapter from there', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    expect(panel.get<HTMLInputElement>('#codex-role').element.value).toBe('lead')
    expect(panel.text()).toContain('Ilk')
    const chapter = panel.findAll('button').find((button) => button.text() === 'The Ferry')
    await chapter?.trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
  })

  it('adds another name', async () => {
    await useEditorStore().open('characters/Ilka.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    const input = panel
      .findAll('input')
      .find((candidate) => candidate.attributes('placeholder')?.startsWith('Add another name'))
    await input?.setValue('Ili')
    await input?.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useCodexStore().properties?.aliases).toEqual(['Ilk', 'Ili'])
  })

  it('shows a note with a title only', async () => {
    await useEditorStore().open('notes/Research.md')
    const panel = mount(CodexInspector)
    await flushPromises()
    expect(panel.text()).toContain('Title')
    expect(panel.find('#codex-role').exists()).toBe(false)
    expect(panel.text()).not.toContain('Appears in')
  })
})
