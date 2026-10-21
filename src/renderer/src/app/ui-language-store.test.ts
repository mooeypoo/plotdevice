// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import LanguageSelector from '../shared/LanguageSelector.vue'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(() => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})
afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
})

describe('reactive interface language', () => {
  it('restores before mounting and invalidates existing computed messages on events', async () => {
    await fake.api.uiLanguage.set('he')
    const language = useUiLanguageStore()
    await language.initialize()
    const message = computed(() => language.t('view-write'))
    expect(message.value).toBe('כתיבה')
    expect(document.documentElement.lang).toBe('he')
    expect(document.documentElement.dir).toBe('rtl')
    await fake.api.uiLanguage.set('en')
    expect(message.value).toBe('Write')
    expect(document.documentElement.dir).toBe('ltr')
    language.$dispose()
    await fake.api.uiLanguage.set('he')
    expect(language.locale).toBe('en')
  })

  it('switches through an accessible selector without replacing an unsaved draft or writing files', async () => {
    const language = useUiLanguageStore()
    await language.initialize()
    await useManuscriptStore().load()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('טיוטה בעברית with English')
    const entry = editor.entry
    const before = [...fake.files]
    const writing = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    const selector = mount(LanguageSelector)
    expect(selector.find('label').text()).toContain('Interface language')
    await selector.find('select').setValue('he')
    await flushPromises()
    expect(selector.find('label').text()).toContain('שפת הממשק')
    expect(selector.find('option[value="he"]').attributes('dir')).toBe('rtl')
    expect(editor.entry).toBe(entry)
    expect(editor.text).toBe('טיוטה בעברית with English')
    expect(editor.saveState).toBe('unsaved')
    expect([...fake.files]).toEqual(before)
    expect(writing).not.toHaveBeenCalled()
    selector.unmount()
    await editor.close()
    language.$dispose()
  })

  it('retains the selected language and renders an error when persistence fails', async () => {
    const language = useUiLanguageStore()
    await language.initialize()
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(fake.api.uiLanguage, 'set').mockResolvedValue({
      ok: false,
      error: { code: 'ui-language-write', message: 'Disk full' }
    })
    const selector = mount(LanguageSelector)
    await selector.find('select').setValue('he')
    await flushPromises()
    expect(language.locale).toBe('en')
    expect(selector.find('select').element.value).toBe('en')
    expect(selector.find('[role="alert"]').text()).toContain('previous language')
    expect(report).toHaveBeenCalledOnce()
    selector.unmount()
  })

  it('reports rejected IPC requests and re-enables selection', async () => {
    const language = useUiLanguageStore()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(fake.api.uiLanguage, 'set').mockRejectedValue(new Error('IPC unavailable'))
    await language.change('he')
    expect(language.busy).toBe(false)
    expect(language.locale).toBe('en')
    expect(language.errorMessage).toContain('could not be saved')
  })
})
