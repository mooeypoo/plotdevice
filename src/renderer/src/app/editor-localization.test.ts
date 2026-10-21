// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useCodexStore } from './codex-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'
import type { ApiResult, RenamePlanDto } from '../../../contract/dtos'
import { useInspectorStore } from './inspector-store'

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
  it('retranslates a fake obsolete type action without changing any files', async () => {
    await useEditorStore().open('First frost.md')
    const before = new Map(fake.files)
    expect(await useCodexStore().setEntryType('characters/Ilka.md', 'note')).toBe(false)
    expect(useEditorStore().actionError).toContain('already has a type')
    await useUiLanguageStore().change('he')
    expect(useEditorStore().actionError).toContain('כבר מוגדר סוג')
    expect(fake.codexWrites).toEqual([])
    expect(fake.files).toEqual(before)
  })

  it.each(['chapter', 'part', 'codex', 'outline', 'template', 'type', 'fix', 'status'] as const)(
    'retranslates a cached %s refusal without repeating the mutation',
    async (action) => {
      const editor = useEditorStore()
      await editor.open('First frost.md')
      const failure = {
        ok: false,
        error: {
          code: 'read-only',
          message: 'Legacy mutation failure',
          diagnostic: { reason: 'read-only' }
        }
      } as const
      const manuscript = useManuscriptStore()
      const codex = useCodexStore()
      const inspector = useInspectorStore()
      const operation =
        action === 'chapter'
          ? vi.spyOn(fake.api.manuscript, 'createChapter').mockResolvedValue(failure)
          : action === 'part'
            ? vi.spyOn(fake.api.manuscript, 'createPart').mockResolvedValue(failure)
            : action === 'codex'
              ? vi.spyOn(fake.api.codex, 'createEntry').mockResolvedValue(failure)
              : action === 'outline'
                ? vi.spyOn(fake.api.codex, 'createOutline').mockResolvedValue(failure)
                : action === 'template'
                  ? vi.spyOn(fake.api.codex, 'editTemplate').mockResolvedValue(failure)
                  : action === 'type'
                    ? vi.spyOn(fake.api.codex, 'setEntryType').mockResolvedValue(failure)
                    : action === 'fix'
                      ? vi.spyOn(fake.api.manuscript, 'fixWarning').mockResolvedValue(failure)
                      : vi.spyOn(fake.api.manuscript, 'addStatus').mockResolvedValue(failure)
      const before = new Map(fake.files)
      if (action === 'chapter') await manuscript.createChapter(null, 'New')
      else if (action === 'part') await manuscript.createPart('New')
      else if (action === 'codex') await codex.createEntry('note', 'New')
      else if (action === 'outline') await codex.createOutline('New')
      else if (action === 'template') await codex.editTemplate('note')
      else if (action === 'type') await codex.setEntryType('Loose thoughts.md', 'note')
      else if (action === 'fix')
        await manuscript.fixWarning('First frost.md', { kind: 'quote', key: 'pov' })
      else await inspector.addStatus('New')
      const message = () => (action === 'status' ? inspector.error : editor.actionError)
      expect(message()).toContain('read-only')
      const read = vi.spyOn(fake.api.manuscript, 'openEntry')
      await useUiLanguageStore().change('he')
      expect(message()).toContain('לקריאה בלבד')
      expect(message()).not.toContain('Legacy')
      expect(operation).toHaveBeenCalledOnce()
      expect(read).not.toHaveBeenCalled()
      expect(fake.files).toEqual(before)
      expect(editor.entry?.path).toBe('First frost.md')
      expect(fake.created).toEqual([])
      expect(fake.saves).toEqual([])
    }
  )

  it.each(['First frost.md', 'characters/Ilka.md'])(
    'retains a rename refusal for %s without moving or retrying',
    async (path) => {
      const editor = useEditorStore()
      await editor.open(path)
      const api = path.startsWith('characters/') ? fake.api.codex : fake.api.manuscript
      const rename = vi.spyOn(api, 'renameEntry').mockResolvedValue({
        ok: false,
        error: {
          code: 'move-failed',
          message: 'Legacy',
          diagnostic: { reason: 'file-move-failed', path }
        }
      })
      const before = new Map(fake.files)
      expect(await editor.renameEntry(path)).toBe(false)
      expect(editor.actionError).toContain("couldn't be moved")
      await useUiLanguageStore().change('he')
      expect(editor.actionError).toContain(`\u2068${path}\u2069`)
      expect(editor.actionError).toMatch(/[\u0590-\u05ff]/u)
      expect(rename).toHaveBeenCalledOnce()
      expect(editor.entry?.path).toBe(path)
      expect(fake.files).toEqual(before)
      expect(fake.renames).toEqual([])
    }
  )

  it('ignores a failed rename plan for a document that is no longer current', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    let finish: (result: ApiResult<RenamePlanDto | null>) => void = () => {
      throw new Error('expected pending rename plan')
    }
    const plan = new Promise<ApiResult<RenamePlanDto | null>>((resolve) => {
      finish = resolve
    })
    vi.spyOn(fake.api.manuscript, 'planRename').mockReturnValueOnce(plan)
    const pending = editor.offerRename('First frost.md')
    await editor.open('The Ferry.md')
    finish({
      ok: false,
      error: {
        code: 'unreadable',
        message: 'Stale failure',
        diagnostic: { reason: 'file-unreadable', path: 'First frost.md' }
      }
    })
    await pending
    expect(editor.entry?.path).toBe('The Ferry.md')
    expect(editor.actionError).toBeNull()
    expect(editor.pendingRename).toBeNull()
  })

  it.each(['moveChapter', 'movePart', 'renumberPart'] as const)(
    'reformats a cached %s failure without retrying or losing the draft',
    async (operation) => {
      const editor = useEditorStore()
      await editor.open('First frost.md')
      editor.edit('Draft טיוטה')
      const failure = {
        ok: false,
        error: {
          code: 'read-only',
          message: 'Legacy',
          diagnostic: { reason: 'read-only' }
        }
      } as const
      const write = vi.spyOn(fake.api.manuscript, operation).mockResolvedValue(failure)
      const manuscript = useManuscriptStore()
      const result =
        operation === 'moveChapter'
          ? await manuscript.moveChapter('First frost.md', null)
          : operation === 'movePart'
            ? await manuscript.movePart('Part One.md', 0)
            : await manuscript.renumberPart('Part One.md')
      expect(result).toBe(false)
      expect(editor.actionError).toContain('read-only')
      const reads = vi.spyOn(fake.api.manuscript, 'openEntry')
      const saves = [...fake.saves]
      await useUiLanguageStore().change('he')
      expect(editor.actionError).toContain('לקריאה בלבד')
      expect(write).toHaveBeenCalledOnce()
      expect(reads).not.toHaveBeenCalled()
      expect(fake.saves).toEqual(saves)
      expect(editor.text).toBe('Draft טיוטה')
    }
  )

  it.each([1, 2])(
    'reformats the %i-file partial renumber notice without rerunning it',
    async (count) => {
      const editor = useEditorStore()
      await editor.open('First frost.md')
      const failed = ['notes/יעל.md', 'notes/Second.md'].slice(0, count)
      const renumber = vi.spyOn(fake.api.manuscript, 'renumberPart').mockResolvedValue({
        ok: true,
        value: { changed: 1, failed }
      })
      expect(await useManuscriptStore().renumberPart(null)).toBe(true)
      expect(editor.actionError).toContain(`${String(count)} ${count === 1 ? 'file' : 'files'}`)
      await useUiLanguageStore().change('he')
      expect(editor.actionError).toMatch(/[\u0590-\u05ff]/u)
      expect(renumber).toHaveBeenCalledOnce()
      expect(fake.moves).toEqual([])
    }
  )

  it.each(['First frost.md', 'characters/Ilka.md'])(
    'keeps the exact skipped-link paths after renaming %s and switching language',
    async (path) => {
      const editor = useEditorStore()
      await editor.open(path)
      const api = path.startsWith('characters/') ? fake.api.codex : fake.api.manuscript
      const skipped = ['notes/יעל (draft).md', 'notes/<img src=x>.md']
      const rename = vi.spyOn(api, 'renameEntry').mockResolvedValue({
        ok: true,
        value: { path, linkCount: 1, fileCount: 1, skipped }
      })
      expect(await editor.renameEntry(path)).toBe(true)
      expect(editor.actionError).toContain('Renamed, but links')
      await useUiLanguageStore().change('he')
      for (const skippedPath of skipped)
        expect(editor.actionError).toContain(`\u2068${skippedPath}\u2069`)
      expect(editor.actionError).toMatch(/[\u0590-\u05ff]/u)
      expect(rename).toHaveBeenCalledOnce()
      expect(editor.entry?.path).toBe(path)
    }
  )

  it('reports a failed rename plan instead of silently dropping the reason', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    const plan = vi.spyOn(fake.api.manuscript, 'planRename').mockResolvedValue({
      ok: false,
      error: {
        code: 'unreadable',
        message: 'Legacy',
        diagnostic: { reason: 'file-unreadable', path: 'First frost.md' }
      }
    })
    await editor.offerRename('First frost.md')
    expect(editor.pendingRename).toBeNull()
    expect(editor.actionError).toContain("can't be read")
    await useUiLanguageStore().change('he')
    expect(editor.actionError).toMatch(/[\u0590-\u05ff]/u)
    expect(plan).toHaveBeenCalledOnce()
    expect(fake.renames).toEqual([])
  })

  it('keeps fake group and relationship guard failures semantic without mutating properties', async () => {
    const path = 'characters/Ilka.md'
    const props = fake.codexProperties.get(path)
    const read = await fake.api.codex.getProperties(path)
    if (props === undefined || !read.ok) throw new Error('expected character properties')
    const unsafe = { ...props, groupsEditable: false }
    fake.codexProperties.set(path, unsafe)
    expect(
      await fake.api.codex.updateProperties(path, read.value.version, { groups: ['New'] })
    ).toMatchObject({
      ok: false,
      error: { diagnostic: { reason: 'groups-not-editable' } }
    })
    expect(fake.codexProperties.get(path)).toEqual(unsafe)
    const location = { ...props, kind: 'location' } as const
    fake.codexProperties.set(path, location)
    expect(await fake.api.codex.updateRelationships(path, read.value.version, [])).toMatchObject({
      ok: false,
      error: { diagnostic: { reason: 'not-a-character' } }
    })
    expect(fake.codexProperties.get(path)).toEqual(location)
  })

  it.each(['First frost.md', 'characters/Ilka.md'])(
    'reports and retranslates a property read refusal for %s without another read',
    async (path) => {
      const editor = useEditorStore()
      await editor.open(path)
      const failure = {
        ok: false,
        error: {
          code: 'unreadable',
          message: 'Legacy',
          diagnostic: { reason: 'file-unreadable', path }
        }
      } as const
      const read = path.startsWith('characters/')
        ? vi.spyOn(fake.api.codex, 'getProperties').mockResolvedValue(failure)
        : vi.spyOn(fake.api.manuscript, 'getEntryProperties').mockResolvedValue(failure)
      const store = path.startsWith('characters/') ? useCodexStore() : useManuscriptStore()
      const draft = editor.text
      await store.readProperties(path)
      expect(store.properties).toBeNull()
      expect(editor.actionError).toContain("can't be read")
      await useUiLanguageStore().change('he')
      expect(editor.actionError).toMatch(/[\u0590-\u05ff]/u)
      expect(editor.actionError).toContain(`\u2068${path}\u2069`)
      expect(read).toHaveBeenCalledOnce()
      expect(editor.text).toBe(draft)
      expect(fake.saves).toEqual([])
    }
  )

  it.each(['read', 'write'])(
    'retains a background synopsis %s failure without changing the writing target',
    async (stage) => {
      const editor = useEditorStore()
      await editor.open('First frost.md')
      const failure = {
        ok: false,
        error: {
          code: 'unreadable',
          message: 'Legacy',
          diagnostic: { reason: 'file-unreadable', path: 'The Ferry.md' }
        }
      } as const
      const operation =
        stage === 'read'
          ? vi.spyOn(fake.api.manuscript, 'getEntryProperties').mockResolvedValue(failure)
          : vi.spyOn(fake.api.manuscript, 'updateEntryProperties').mockResolvedValue(failure)
      expect(await useManuscriptStore().updateSynopsis('The Ferry.md', 'New synopsis')).toBe(false)
      expect(editor.actionError).toContain('The Ferry.md')
      await useUiLanguageStore().change('he')
      expect(editor.actionError).toMatch(/[\u0590-\u05ff]/u)
      expect(operation).toHaveBeenCalledOnce()
      expect(editor.entry?.path).toBe('First frost.md')
    }
  )

  it.each(['First frost.md', 'characters/Ilka.md'])(
    'retains semantic property failure for %s without retrying on a language switch',
    async (path) => {
      const editor = useEditorStore()
      await editor.open(path)
      const failure = {
        ok: false,
        error: {
          code: 'cannot-edit',
          message: 'Legacy detail',
          diagnostic: { reason: 'frontmatter-unsupported', key: 'title' }
        }
      } as const
      const write = path.startsWith('characters/')
        ? vi.spyOn(fake.api.codex, 'updateProperties').mockResolvedValue(failure)
        : vi.spyOn(fake.api.manuscript, 'updateEntryProperties').mockResolvedValue(failure)
      const store = path.startsWith('characters/') ? useCodexStore() : useManuscriptStore()
      expect(await store.updateProperties({ title: 'New title' })).toBe(false)
      expect(editor.actionError).toContain('title')
      const before = new Map(fake.files)
      const read = vi.spyOn(fake.api.manuscript, 'openEntry')
      const codexRead = vi.spyOn(fake.api.codex, 'openEntry')
      await useUiLanguageStore().change('he')
      expect(editor.actionError).toMatch(/[\u0590-\u05ff]/u)
      expect(editor.actionError).toContain('\u2068title\u2069')
      expect(editor.actionError).not.toContain('Legacy detail')
      expect(write).toHaveBeenCalledOnce()
      expect(read).not.toHaveBeenCalled()
      expect(codexRead).not.toHaveBeenCalled()
      expect(fake.files).toEqual(before)
      expect(editor.saveState).toBe('saved')
    }
  )

  it('reformats the relationship safety explanation and its cached diagnostic together', async () => {
    const editor = useEditorStore()
    await editor.open('characters/Ilka.md')
    const write = vi.spyOn(fake.api.codex, 'updateRelationships').mockResolvedValue({
      ok: false,
      error: {
        code: 'cannot-edit',
        message: 'Legacy detail',
        diagnostic: { reason: 'frontmatter-unsupported', key: 'relationships' }
      }
    })
    const before = new Map(fake.files)
    expect(await useCodexStore().updateRelationships([{ with: 'יעל' }])).toBe(false)
    expect(useCodexStore().relationshipsError).toContain('left the file as it is')
    await useUiLanguageStore().change('he')
    expect(useCodexStore().relationshipsError).toContain('relationships')
    expect(useCodexStore().relationshipsError).not.toMatch(/Legacy detail|left the file/u)
    expect(useCodexStore().relationshipsError).toMatch(/[\u0590-\u05ff]/u)
    await useUiLanguageStore().change('en')
    expect(useCodexStore().relationshipsError).toContain('Edit them in the file itself')
    expect(write).toHaveBeenCalledOnce()
    expect(fake.files).toEqual(before)
  })

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
