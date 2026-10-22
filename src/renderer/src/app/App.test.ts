// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
let beforeClose: () => void
beforeEach(async () => {
  window.confirm = vi.fn(() => true)
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  fake.api.app.onBeforeClose = (listener) => {
    beforeClose = listener
    return () => undefined
  }
  await useManuscriptStore().load()
  const editor = useEditorStore()
  await editor.open('First frost.md')
  editor.edit('Unsaved draft\n')
  fake.files.delete('First frost.md')
  await editor.syncFromDisk([{ path: 'First frost.md', kind: 'removed' }])
})
afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'confirm')
})

const mountApp = () =>
  mount(App, {
    global: { stubs: { WelcomeScreen: true, InitializePrompt: true, ProjectLayout: true } }
  })

describe('window close with unresolved recovery', () => {
  it('cancels closing while document navigation is pending', async () => {
    const cancel = vi.spyOn(fake.api.app, 'cancelClose')
    const ready = vi.spyOn(fake.api.app, 'readyToClose')
    const app = mountApp()
    useEditorStore().discardMissing()
    const opening = useEditorStore().open('The Ferry.md')
    beforeClose()
    expect(cancel).toHaveBeenCalledOnce()
    expect(ready).not.toHaveBeenCalled()
    await opening
    app.unmount()
  })
  it('cancels closing when the writer declines to lose the draft', async () => {
    const ready = vi.spyOn(fake.api.app, 'readyToClose')
    const cancel = vi.spyOn(fake.api.app, 'cancelClose')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const save = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    const app = mountApp()
    beforeClose()
    await flushPromises()
    expect(confirm).toHaveBeenCalledExactlyOnceWith(
      'Your open draft has unresolved changes. Close anyway and lose the draft? Files on disk will not be changed.'
    )
    expect(cancel).toHaveBeenCalledOnce()
    expect(ready).not.toHaveBeenCalled()
    expect(useEditorStore().text).toBe('Unsaved draft\n')
    expect(fake.files.has('First frost.md')).toBe(false)
    expect(save).not.toHaveBeenCalled()
    app.unmount()
  })

  it('uses the selected Hebrew wording without changing close or file behavior', async () => {
    const ready = vi.spyOn(fake.api.app, 'readyToClose')
    const cancel = vi.spyOn(fake.api.app, 'cancelClose')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const save = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    const app = mountApp()
    await useUiLanguageStore().change('he')
    beforeClose()
    await flushPromises()

    expect(confirm).toHaveBeenCalledExactlyOnceWith(
      'בטיוטה הפתוחה שלך יש שינויים שלא נפתרו. לסגור בכל זאת ולאבד את הטיוטה? הקבצים שבדיסק לא ישתנו.'
    )
    expect(cancel).toHaveBeenCalledOnce()
    expect(ready).not.toHaveBeenCalled()
    expect(useEditorStore().text).toBe('Unsaved draft\n')
    expect(fake.files.has('First frost.md')).toBe(false)
    expect(save).not.toHaveBeenCalled()
    app.unmount()
  })

  it('allows explicit discard on exit without recreating the missing file', async () => {
    const ready = vi.spyOn(fake.api.app, 'readyToClose')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const app = mountApp()
    beforeClose()
    await flushPromises()
    expect(ready).toHaveBeenCalledOnce()
    expect(fake.files.has('First frost.md')).toBe(false)
    app.unmount()
  })

  it('cancels closing without asking to discard while recovery is in flight', async () => {
    const cancel = vi.spyOn(fake.api.app, 'cancelClose')
    const ready = vi.spyOn(fake.api.app, 'readyToClose')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const original = fake.api.recovery.saveCopy.bind(fake.api.recovery)
    let release: () => void = () => {
      throw new Error('Copy did not start')
    }
    vi.spyOn(fake.api.recovery, 'saveCopy').mockImplementation(async (...args) => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return original(...args)
    })
    const app = mountApp()
    const copying = useEditorStore().saveMissingAsNew()
    beforeClose()
    expect(cancel).toHaveBeenCalledOnce()
    expect(confirm).not.toHaveBeenCalled()
    expect(ready).not.toHaveBeenCalled()
    release()
    await copying
    app.unmount()
  })
})
