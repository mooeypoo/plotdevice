// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import TemplateInspector from './TemplateInspector.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useCodexStore().load(), useManuscriptStore().load()])
})

describe('TemplateInspector', () => {
  it('translates guidance and generated kinds without changing the template or file', async () => {
    const codex = useCodexStore()
    expect(await codex.editTemplate('character')).toBe(true)
    const editor = useEditorStore()
    editor.edit('## Unsaved template')
    const text = editor.text
    const reads = vi.spyOn(fake.api.codex, 'openEntry')
    const writes = vi.spyOn(fake.api.codex, 'saveEntryText')
    const templateWrites = [...fake.codexWrites]
    const panel = mount(TemplateInspector)

    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(panel.get('aside').attributes('aria-label')).toBe('פרטים')
    expect(panel.get('header .eyebrow').text()).toBe('תבנית')
    expect(panel.text()).toContain('רשומת דמות חדשה מתחילה כהעתק')
    expect(panel.text()).toContain('מטא־נתונים')
    expect(panel.findAll('code').map((code) => code.text())).toEqual(['role:', 'type', 'title'])
    expect(panel.get('.hint').text()).toBe('נשמר ב־⁨templates/character.md⁩')
    expect(editor.text).toBe(text)
    expect(reads).not.toHaveBeenCalled()
    expect(writes).not.toHaveBeenCalled()
    expect(fake.codexWrites).toEqual(templateWrites)
    panel.unmount()
  })
})
