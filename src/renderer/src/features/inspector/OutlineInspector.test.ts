// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useOutlineStore } from '../../app/outline-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import OutlineInspector from './OutlineInspector.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useCodexStore().load(), useOutlineStore().load(), useManuscriptStore().load()])
})

describe('OutlineInspector', () => {
  it('translates its guidance while retaining the open outline without project access', async () => {
    const editor = useEditorStore()
    await editor.open('Outline.md')
    editor.edit('# Unsaved outline')
    const text = editor.text
    const read = vi.spyOn(fake.api.codex, 'openEntry')
    const write = vi.spyOn(fake.api.codex, 'saveEntryText')
    const panel = mount(OutlineInspector)

    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(panel.get('aside').attributes('aria-label')).toBe('פרטים')
    expect(panel.get('header .eyebrow').text()).toBe('מתווה')
    expect(panel.text()).toContain('התוכנית שלך, במילים שלך.')
    expect(panel.text()).toContain('[[their names]]')
    expect(panel.text()).toContain('Ctrl+Shift+O')
    expect(panel.get('.hint').text()).toBe('נשמר ב־⁨Outline.md⁩')
    expect(editor.text).toBe(text)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(fake.saves).toEqual([])
    panel.unmount()
  })
})
