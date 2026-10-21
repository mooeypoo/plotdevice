// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useCodexStore } from './codex-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true)
  )
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
  await useUiLanguageStore().initialize()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('cached editor failures and notices', () => {
  it.each(['First frost.md', 'characters/Ilka.md'])(
    'reformats a failed save for %s without retrying it',
    async (path) => {
      const editor = useEditorStore()
      await editor.open(path)
      const api = path.startsWith('characters/') ? fake.api.codex : fake.api.manuscript
      const save = vi.spyOn(api, 'saveEntryText').mockResolvedValue({
        ok: false,
        error: {
          code: 'write-failed',
          message: 'Legacy',
          diagnostic: {
            reason: 'file-write-failed',
            path,
            detail: 'ENOSPC (יעל)'
          }
        }
      })
      const read = vi.spyOn(api, 'openEntry')
      editor.edit('Unsaved טיוטה\n')
      await editor.flush()
      expect(editor.saveState).toBe('error')
      expect(editor.saveError).toContain("Couldn't save")
      expect(editor.saveError).toContain('\u2068ENOSPC (יעל)\u2069')
      const writes = save.mock.calls.length
      await useUiLanguageStore().change('he')
      expect(editor.saveError).toContain('לא ניתן לשמור')
      expect(editor.saveError).toContain(`\u2068${path}\u2069`)
      expect(editor.saveState).toBe('error')
      expect(editor.text).toBe('Unsaved טיוטה\n')
      expect(await editor.open('The Ferry.md')).toBe(false)
      expect(editor.actionError).toContain('יש לטפל')
      await useUiLanguageStore().change('en')
      expect(editor.actionError).toContain('Resolve the unsaved')
      expect(editor.saveError).toContain("Couldn't save")
      expect(save).toHaveBeenCalledTimes(writes)
      expect(read).not.toHaveBeenCalled()
      expect(fake.saves).toEqual([])
    }
  )

  it('retains a failed recovery reason and draft across locale switches, then retries explicitly', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    editor.edit('Unsaved טיוטה')
    fake.files.set('First frost.md', 'Outside change')
    await editor.syncFromDisk([{ path: 'First frost.md', kind: 'changed' }])
    const save = vi.spyOn(fake.api.recovery, 'saveCopy').mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'write-failed',
        message: 'Legacy',
        diagnostic: {
          reason: 'recovery-write-failed',
          detail: 'EACCES (/תיקייה)'
        }
      }
    })
    expect(await editor.saveMissingAsNew()).toBe(false)
    expect(editor.recoveryError).toContain('Could not save a recovered copy')
    const read = vi.spyOn(fake.api.manuscript, 'openEntry')
    await useUiLanguageStore().change('he')
    expect(editor.recoveryError).toContain('לא ניתן לשמור עותק משוחזר')
    expect(editor.recoveryError).toContain('\u2068EACCES (/תיקייה)\u2069')
    expect(editor.saveState).toBe('conflict')
    expect(editor.text).toBe('Unsaved טיוטה')
    expect(save).toHaveBeenCalledOnce()
    expect(read).not.toHaveBeenCalled()
    expect(fake.created).toEqual([])
    expect(fake.files.get('First frost.md')).toBe('Outside change')
    expect(await editor.saveMissingAsNew()).toBe(true)
    expect(editor.diskNotice).toContain('נשמר עותק משוחזר')
    const reads = read.mock.calls.length
    await useUiLanguageStore().change('en')
    expect(editor.diskNotice).toContain('Saved a recovered copy')
    expect(save).toHaveBeenCalledTimes(2)
    expect(read).toHaveBeenCalledTimes(reads)
    expect(fake.files.get('First frost.md')).toBe('Outside change')
  })

  it('localizes destructive confirmation without weakening the fresh-version precondition', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    editor.edit('My draft')
    fake.files.set('First frost.md', 'Outside')
    await editor.syncFromDisk([{ path: 'First frost.md', kind: 'changed' }])
    await useUiLanguageStore().change('he')
    const confirm = vi.spyOn(window, 'confirm').mockImplementation(() => {
      fake.files.set('First frost.md', 'Changed during confirmation')
      return true
    })
    await editor.keepMine()
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('להחליף את הטקסט'))
    expect(editor.saveState).toBe('conflict')
    expect(editor.recoveryError).toContain('השתנה שוב')
    expect(editor.text).toBe('My draft')
    expect(fake.files.get('First frost.md')).toBe('Changed during confirmation')
    await useUiLanguageStore().change('en')
    expect(editor.recoveryError).toContain('changed again')
    expect(fake.saves).toEqual([])
  })
})
