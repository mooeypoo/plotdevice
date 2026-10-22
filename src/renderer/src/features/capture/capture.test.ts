// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCaptureStore } from '../../app/capture-store'
import { useCodexStore } from '../../app/codex-store'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useOutlineStore } from '../../app/outline-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { usePaletteCommands } from '../../app/use-palette-commands'
import { useWorkspaceStore } from '../../app/workspace-store'
import { useWritingPreferencesStore } from '../../app/writing-preferences-store'
import CaptureBox from './CaptureBox.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load(), useOutlineStore().load()])
  useDocumentTabsStore().restore('/book')
})

const paletteHasCapture = (): boolean =>
  usePaletteCommands().commands.value.some((item) => item.id === 'command:capture-beat')

describe('capturing a beat', () => {
  it('is off by default: no command, and the box does not open', () => {
    expect(useWritingPreferencesStore().captureBeats).toBe(false)
    expect(paletteHasCapture()).toBe(false)
    useCaptureStore().show()
    expect(useCaptureStore().open).toBe(false)
  })

  it('appends the beat, with a link to the Writing chapter when asked', async () => {
    const preferences = useWritingPreferencesStore()
    preferences.setCaptureBeats(true)
    expect(paletteHasCapture()).toBe(true)
    const capture = useCaptureStore()
    expect(await capture.capture('The gate creaks')).toBe(true)
    preferences.setCaptureLinksChapter(true)
    await useEditorStore().open('First frost.md')
    expect(await capture.capture('  Again, colder  ')).toBe(true)
    expect(fake.captures).toEqual([
      'Outline.md: The gate creaks',
      'Outline.md: Again, colder [[First frost]]'
    ])
  })

  it('saves the outline open in the editor first, then shows the captured text there', async () => {
    useWritingPreferencesStore().setCaptureBeats(true)
    const editor = useEditorStore()
    await editor.open('Outline.md')
    editor.edit(`${editor.text}- Typed beat\n`)
    expect(await useCaptureStore().capture('Captured beat')).toBe(true)
    expect(fake.captures).toEqual(['Outline.md: Captured beat (versioned)'])
    expect(editor.text).toContain('- Typed beat\n- Captured beat\n')
    expect(editor.saveState).toBe('saved')
  })

  it('is refused while the outline’s draft in the editor is in conflict', async () => {
    useWritingPreferencesStore().setCaptureBeats(true)
    const editor = useEditorStore()
    await editor.open('Outline.md')
    editor.edit('Mine.')
    fake.files.set('Outline.md', 'Outside.')
    await editor.flush()
    const capture = useCaptureStore()
    expect(await capture.capture('Idea')).toBe(false)
    expect(capture.error).toContain('resolve them first')
    expect(fake.captures).toEqual([])
    expect(editor.text).toBe('Mine.')
  })
})

describe('CaptureBox', () => {
  it('captures on Enter, closes on Escape, and returns focus', async () => {
    useWritingPreferencesStore().setCaptureBeats(true)
    const before = document.createElement('button')
    document.body.append(before)
    before.focus()
    const box = mount(CaptureBox, { attachTo: document.body })
    const capture = useCaptureStore()
    capture.show()
    await flushPromises()
    const input = box.get<HTMLInputElement>('input')
    expect(document.activeElement).toBe(input.element)
    expect(box.get('label').text()).toBe('Goes to the end of the Inbox in ⁨Outline⁩')
    await input.setValue('Bea knew all along')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(fake.captures).toEqual(['Outline.md: Bea knew all along'])
    expect(capture.open).toBe(false)
    expect(document.activeElement).toBe(before)

    capture.show()
    await flushPromises()
    await useUiLanguageStore().change('he')
    expect(box.get('input').attributes('placeholder')).toBe('שורה אחת, ואז Enter')
    await box.get('input').trigger('keydown', { key: 'Escape' })
    expect(capture.open).toBe(false)
    box.unmount()
    before.remove()
  })
})
