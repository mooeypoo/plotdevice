import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTOSAVE_DELAY_MS, useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useCodexStore } from './codex-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'

let fake: ReturnType<typeof createFakePlotDeviceApi>
const changed = [{ path: 'First frost.md', kind: 'changed' }] as const

beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal('window', { confirm: vi.fn(() => true) })
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function conflict() {
  const editor = useEditorStore()
  await editor.open('First frost.md')
  editor.edit('My unsaved draft.\n')
  fake.files.set('First frost.md', 'Intentionally edited outside.\n')
  await editor.syncFromDisk(changed)
  return editor
}
async function missing() {
  const editor = useEditorStore()
  await editor.open('First frost.md')
  editor.edit('My unsaved draft.\n')
  fake.files.delete('First frost.md')
  await editor.syncFromDisk(changed)
  return editor
}

describe('explicit entry recovery', () => {
  it('leaves clean external edits authoritative, with no writes or recovery copies', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    fake.files.set('First frost.md', 'Intentional outside text.\n')
    await editor.syncFromDisk(changed)
    expect(editor.text).toBe('Intentional outside text.\n')
    expect(editor.saveState).toBe('saved')
    expect(fake.saves).toEqual([])
    expect(fake.created).toEqual([])
  })

  it('recovers conflict text separately with captured properties; leaves outside changes intact', async () => {
    const properties = fake.properties.get('First frost.md')
    if (properties === undefined) throw new Error('Expected chapter properties')
    fake.properties.set('First frost.md', {
      ...properties,
      status: 'draft',
      synopsis: 'Keep this',
      pov: ['[[Ilka]]']
    })
    const editor = await conflict()
    fake.properties.set('First frost.md', { ...properties, status: 'final' })
    expect(await editor.saveMissingAsNew()).toBe(true)
    expect(editor.entry?.path).toBe('First frost (recovered).md')
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(fake.files.get('First frost.md')).toBe('Intentionally edited outside.\n')
    expect(fake.properties.get('First frost (recovered).md')).toMatchObject({
      status: 'draft',
      synopsis: 'Keep this',
      pov: ['[[Ilka]]']
    })
    expect(editor.saveState).toBe('saved')
  })

  it('keeps metadata written through the inspector before the deletion', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    await useManuscriptStore().updateProperties({ status: 'revised', synopsis: 'Latest synopsis' })
    fake.files.delete('First frost.md')
    await editor.syncFromDisk(changed)
    await editor.saveMissingAsNew()
    expect(fake.properties.get('First frost (recovered).md')).toMatchObject({
      status: 'revised',
      synopsis: 'Latest synopsis'
    })
  })

  it('keeps a deletion intentional until the user explicitly saves a copy or closes the draft', async () => {
    const editor = await missing()
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 3)
    expect(fake.files.has('First frost.md')).toBe(false)
    expect(fake.created).toEqual([])
    editor.discardMissing()
    expect(editor.entry).toBeNull()
    expect(fake.files.has('First frost.md')).toBe(false)
  })

  it('does not resume autosave after the original path reappears, even with matching baseline text', async () => {
    const editor = await missing()
    fake.files.set('First frost.md', 'Four words are here.\n')
    await editor.syncFromDisk(changed)
    expect(editor.missingReappeared).toBe(true)
    expect(editor.saveState).toBe('missing')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 3)
    expect(fake.files.get('First frost.md')).toBe('Four words are here.\n')
    expect(editor.text).toBe('My unsaved draft.\n')
    await editor.loadVersionOnDisk()
    expect(editor.text).toBe('Four words are here.\n')
    expect(editor.saveState).toBe('saved')
    expect(fake.saves).toEqual([])
  })

  it('leaves a pending conflict explicit even when a later outside change matches the draft', async () => {
    const editor = await conflict()
    fake.files.set('First frost.md', editor.text)
    await editor.syncFromDisk(changed)
    expect(editor.saveState).toBe('conflict')
    expect(editor.hasStuckChanges).toBe(true)
  })

  it('uses the latest disk version without writing to disk', async () => {
    const editor = await conflict()
    fake.files.set('First frost.md', 'A newer outside edit.\n')
    expect(await editor.loadVersionOnDisk()).toBe(true)
    expect(editor.text).toBe('A newer outside edit.\n')
    expect(fake.saves).toEqual([])
    expect(editor.saveState).toBe('saved')
  })

  it('retains draft and decision state if loading the disk fails', async () => {
    const editor = await conflict()
    vi.spyOn(fake.api.manuscript, 'openEntry').mockResolvedValue({
      ok: false,
      error: { code: 'unreadable', message: 'Cannot read safely' }
    })
    expect(await editor.loadVersionOnDisk()).toBe(false)
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(editor.saveState).toBe('conflict')
    expect(editor.hasStuckChanges).toBe(true)
    expect(editor.recoveryError).toBe('Cannot read safely')
    expect(await editor.open('The Ferry.md')).toBe(false)
  })

  it('turns an unsuccessful disk reload into a missing-file decision, not a discarded draft', async () => {
    const editor = await conflict()
    fake.files.delete('First frost.md')
    expect(await editor.loadVersionOnDisk()).toBe(false)
    expect(editor.saveState).toBe('missing')
    expect(editor.text).toBe('My unsaved draft.\n')
  })

  it('does not replace disk text when confirmation is cancelled', async () => {
    const editor = await conflict()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await editor.keepMine()
    expect(confirm).toHaveBeenCalledOnce()
    expect(fake.files.get('First frost.md')).toBe('Intentionally edited outside.\n')
    expect(editor.saveState).toBe('conflict')
    expect(fake.saves).toEqual([])
  })

  it('refuses replacement if another outside edit arrives during confirmation', async () => {
    const editor = await conflict()
    vi.spyOn(window, 'confirm').mockImplementation(() => {
      fake.files.set('First frost.md', 'Changed during confirmation.\n')
      return true
    })
    await editor.keepMine()
    expect(fake.files.get('First frost.md')).toBe('Changed during confirmation.\n')
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(editor.saveState).toBe('conflict')
    expect(editor.recoveryError).toContain('changed again')
  })

  it('never uses the unconditional overwrite API, even after confirmation', async () => {
    const editor = await conflict()
    const save = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    await editor.keepMine()
    expect(save).toHaveBeenCalledWith(
      'First frost.md',
      'My unsaved draft.\n',
      expect.any(String),
      false
    )
    expect(editor.saveState).toBe('saved')
    expect(fake.files.get('First frost.md')).toBe('My unsaved draft.\n')
    expect(editor.recoveryError).toBeNull()
  })

  it('keeps the choices and draft available after a failed replacement write', async () => {
    const editor = await conflict()
    vi.spyOn(fake.api.manuscript, 'saveEntryText').mockResolvedValue({
      ok: false,
      error: { code: 'write-failed', message: 'Disk full' }
    })
    await editor.keepMine()
    expect(editor.saveState).toBe('conflict')
    expect(editor.recoveryError).toBe('Disk full')
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(fake.files.get('First frost.md')).toBe('Intentionally edited outside.\n')
    expect(await editor.saveMissingAsNew()).toBe(true)
  })

  it('keeps a draft when recovery fails, and prevents dropping it through overview or project close', async () => {
    const editor = await missing()
    vi.spyOn(fake.api.recovery, 'saveCopy').mockResolvedValue({
      ok: false,
      error: { code: 'write-failed', message: 'Disk full' }
    })
    expect(await editor.saveMissingAsNew()).toBe(false)
    expect(editor.recoveryError).toBe('Disk full')
    editor.closeEntry()
    await editor.flush()
    await editor.close()
    expect(editor.entry?.path).toBe('First frost.md')
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(editor.hasStuckChanges).toBe(true)
  })

  it('serializes decisions, disables discard/navigation, and does not make duplicate copies', async () => {
    const editor = await missing()
    const original = fake.api.recovery.saveCopy.bind(fake.api.recovery)
    let finish: (() => void) | undefined
    const copy = vi.spyOn(fake.api.recovery, 'saveCopy').mockImplementation(
      (token, text) =>
        new Promise((resolve) => {
          finish = () => {
            void original(token, text).then(resolve)
          }
        })
    )
    const first = editor.saveMissingAsNew()
    expect(editor.recoveryBusy).toBe(true)
    expect(await editor.saveMissingAsNew()).toBe(false)
    expect(await editor.loadVersionOnDisk()).toBe(false)
    editor.discardMissing()
    expect(await editor.open('The Ferry.md')).toBe(false)
    expect(editor.text).toBe('My unsaved draft.\n')
    finish?.()
    expect(await first).toBe(true)
    expect(copy).toHaveBeenCalledOnce()
    expect(fake.created).toHaveLength(1)
    expect(editor.recoveryBusy).toBe(false)
  })

  it('keeps the original draft if the recovered file cannot be opened, and retries that copy', async () => {
    const editor = await missing()
    const original = fake.api.manuscript.openEntry.bind(fake.api.manuscript)
    const read = vi
      .spyOn(fake.api.manuscript, 'openEntry')
      .mockImplementation((path) =>
        path.includes('recovered')
          ? Promise.resolve({ ok: false, error: { code: 'unreadable', message: 'Locked' } })
          : original(path)
      )
    expect(await editor.saveMissingAsNew()).toBe(false)
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(editor.saveState).toBe('missing')
    expect(editor.recoveredPath).toBe('First frost (recovered).md')
    read.mockRestore()
    expect(await editor.saveMissingAsNew()).toBe(true)
    expect(fake.created).toHaveLength(1)
  })

  it('keeps a draft when the recovered file was edited externally before it was reopened', async () => {
    const editor = await missing()
    const original = fake.api.recovery.saveCopy.bind(fake.api.recovery)
    vi.spyOn(fake.api.recovery, 'saveCopy').mockImplementation(async (token, text) => {
      const result = await original(token, text)
      if (result.ok) fake.files.set(result.value.path, 'Edited recovered copy outside')
      return result
    })
    expect(await editor.saveMissingAsNew()).toBe(false)
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(editor.recoveryError).toContain('changed outside')
    expect(fake.files.get('First frost (recovered).md')).toBe('Edited recovered copy outside')
  })

  it('recovers codex relationships without overwriting an outside character edit', async () => {
    const path = 'characters/Ilka.md'
    const props = fake.codexProperties.get(path)
    if (props === undefined) throw new Error('Expected character')
    fake.codexProperties.set(path, {
      ...props,
      relationships: [{ with: '[[Aunt Bea]]', kind: 'mentor' }]
    })
    const editor = useEditorStore()
    await editor.open(path)
    editor.edit('My character notes\n')
    fake.files.set(path, 'Outside character notes\n')
    await editor.syncFromDisk([{ path, kind: 'changed' }])
    expect(await editor.saveMissingAsNew()).toBe(true)
    expect(fake.codexProperties.get('characters/Ilka (recovered).md')?.relationships).toEqual([
      { with: '[[Aunt Bea]]', kind: 'mentor' }
    ])
    expect(fake.files.get(path)).toBe('Outside character notes\n')
  })

  it('makes a new copy if the writer edits the draft after a failed reopen, keeping the first copy', async () => {
    const editor = await missing()
    const read = vi.spyOn(fake.api.manuscript, 'openEntry').mockResolvedValue({
      ok: false,
      error: { code: 'unreadable', message: 'Locked' }
    })
    expect(await editor.saveMissingAsNew()).toBe(false)
    read.mockRestore()
    editor.edit('A revised recovery draft.\n')
    expect(await editor.saveMissingAsNew()).toBe(true)
    expect(fake.created).toHaveLength(2)
    expect(fake.files.get('First frost (recovered).md')).toBe('My unsaved draft.\n')
    expect(editor.text).toBe('A revised recovery draft.\n')
  })

  it('does not clear a missing-file decision when an earlier save response arrives late', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    const original = fake.api.manuscript.saveEntryText.bind(fake.api.manuscript)
    let release: () => void = () => {
      throw new Error('Save did not start')
    }
    vi.spyOn(fake.api.manuscript, 'saveEntryText').mockImplementation(async (...args) => {
      const result = await original(...args)
      await new Promise<void>((resolve) => {
        release = resolve
      })

      return result
    })
    editor.edit('Text sent before the deletion.\n')
    const flushing = editor.flush()
    await vi.advanceTimersByTimeAsync(0)
    fake.files.delete('First frost.md')
    await editor.syncFromDisk(changed)
    release()
    await flushing
    expect(editor.saveState).toBe('missing')
    expect(editor.text).toBe('Text sent before the deletion.\n')
    expect(fake.files.has('First frost.md')).toBe(false)
  })

  it('notices a reappearance received during a failed recovery without resuming autosave', async () => {
    const editor = await missing()
    vi.spyOn(fake.api.recovery, 'saveCopy').mockImplementation(async () => {
      fake.files.set('First frost.md', 'Reappeared intentionally.\n')
      await editor.syncFromDisk(changed)
      return { ok: false, error: { code: 'write-failed', message: 'Cannot publish' } }
    })
    expect(await editor.saveMissingAsNew()).toBe(false)
    await Promise.resolve()
    expect(editor.missingReappeared).toBe(true)
    expect(editor.saveState).toBe('missing')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2)
    expect(editor.text).toBe('My unsaved draft.\n')
    expect(fake.files.get('First frost.md')).toBe('Reappeared intentionally.\n')
  })

  it('retains a newer captured snapshot when listing refresh replaces the open-entry object', async () => {
    const editor = useEditorStore()
    await editor.open('First frost.md')
    const original = fake.api.recovery.capture.bind(fake.api.recovery)
    let release: () => void = () => {
      throw new Error('Capture did not start')
    }
    const capture = vi.spyOn(fake.api.recovery, 'capture').mockImplementation(async (...args) => {
      const result = await original(...args)
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return result
    })
    const opened = await fake.api.manuscript.openEntry('First frost.md')
    if (!opened.ok) throw new Error(opened.error.message)
    const written = await fake.api.manuscript.updateEntryProperties(
      'First frost.md',
      opened.value.version,
      { synopsis: 'Latest inspector metadata' }
    )
    if (!written.ok) throw new Error(written.error.message)
    editor.propertiesWritten({ ok: true, version: written.value.version })
    await Promise.resolve()
    editor.refreshPlace()
    release()
    await Promise.resolve()
    await Promise.resolve()
    fake.files.delete('First frost.md')
    await editor.syncFromDisk(changed)
    // Opening the recovered copy also captures; do not delay that second capture.
    capture.mockRestore()
    await editor.saveMissingAsNew()
    expect(fake.properties.get('First frost (recovered).md')?.synopsis).toBe(
      'Latest inspector metadata'
    )
  })
})
