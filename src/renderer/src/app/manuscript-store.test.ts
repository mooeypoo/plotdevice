import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePlotDeviceApi, sampleManuscript } from './fake-plot-device-api'
import { AUTOSAVE_DELAY_MS, useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal('window', { confirm: vi.fn(() => true) })
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useManuscriptStore().load()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('manuscript store', () => {
  it('opens a chapter with its place in the book', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('First frost.md')
    expect(store.entry).toMatchObject({
      kind: 'chapter',
      title: 'First frost',
      label: { type: 'part-chapter', partNumber: 1, chapterNumber: 2 }
    })
    expect(store.text).toBe('Four words are here.\n')
    expect(manuscript.currentPart?.title).toBe('Part One: The Orchard')
  })

  it('opens a part’s own text, and an unordered chapter', async () => {
    const store = useEditorStore()
    await store.open('Part One.md')
    expect(store.entry).toMatchObject({ kind: 'part', label: { type: 'part', number: 1 } })
    await store.open('Lost.md')
    expect(store.entry).toMatchObject({ kind: 'chapter', label: { type: 'unordered' } })
  })

  it('autosaves after a pause, and updates chapter, part, and book word counts', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('The Ferry.md')

    store.edit('Now there are five words.\n')
    expect(store.saveState).toBe('unsaved')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 10)

    expect(fake.files.get('The Ferry.md')).toBe('Now there are five words.\n')
    expect(store.saveState).toBe('saved')
    expect(store.wordCount).toBe(5)
    expect(manuscript.manuscript?.parts[0]?.chapters[0]?.wordCount).toBe(5)
    expect(manuscript.manuscript?.parts[0]?.wordCount).toBe(11)
    expect(manuscript.manuscript?.wordCount).toBe(12)
  })

  it('does not save text that matches the file', async () => {
    const store = useEditorStore()
    await store.open('The Ferry.md')
    store.edit('Three words here!\n')
    store.edit('Three words here.\n')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 10)
    expect(fake.saves).toEqual([])
    expect(store.saveState).toBe('saved')
  })

  it('saves the current chapter before opening another', async () => {
    const store = useEditorStore()
    await store.open('The Ferry.md')
    store.edit('Changed.\n')
    await store.open('First frost.md')
    expect(fake.files.get('The Ferry.md')).toBe('Changed.\n')
  })

  it('stops at a conflict, keeps the writer’s text, and refuses to switch away', async () => {
    const store = useEditorStore()
    await store.open('The Ferry.md')
    fake.files.set('The Ferry.md', 'Edited in Obsidian.\n')

    store.edit('Mine.\n')
    await store.flush()

    expect(store.saveState).toBe('conflict')
    expect(fake.files.get('The Ferry.md')).toBe('Edited in Obsidian.\n')
    expect(store.text).toBe('Mine.\n')
    expect(await store.open('First frost.md')).toBe(false)
    expect(store.entry?.path).toBe('The Ferry.md')
  })

  it('resolves a conflict by keeping the writer’s text', async () => {
    const store = useEditorStore()
    await store.open('The Ferry.md')
    fake.files.set('The Ferry.md', 'Edited in Obsidian.\n')
    store.edit('Mine.\n')
    await store.flush()

    await store.keepMine()

    expect(fake.files.get('The Ferry.md')).toBe('Mine.\n')
    expect(store.saveState).toBe('saved')
  })

  it('resolves a conflict by loading the file’s version', async () => {
    const store = useEditorStore()
    await store.open('The Ferry.md')
    const revision = store.entry?.revision
    fake.files.set('The Ferry.md', 'Edited in Obsidian.\n')
    store.edit('Mine.\n')
    await store.flush()

    await store.loadVersionOnDisk()

    expect(store.text).toBe('Edited in Obsidian.\n')
    expect(store.saveState).toBe('saved')
    expect(store.entry?.revision).not.toBe(revision)
  })
})

describe('manuscript store: properties and new entries', () => {
  it('loads the open entry’s properties', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('The Ferry.md')
    expect(manuscript.properties).toMatchObject({ path: 'The Ferry.md', kind: 'chapter' })
  })

  it('saves typing first, then the property change, with no false conflict', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('The Ferry.md')
    store.edit('Typed and not yet saved.\n')

    expect(await manuscript.updateProperties({ status: 'revised' })).toBe(true)

    expect(fake.files.get('The Ferry.md')).toBe('Typed and not yet saved.\n')
    expect(manuscript.properties?.status).toBe('revised')
    store.edit('More typing after the property change.\n')
    await store.flush()
    expect(store.saveState).toBe('saved')
    expect(fake.files.get('The Ferry.md')).toBe('More typing after the property change.\n')
  })

  it('shows a conflict when the file changed outside before a property change', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('The Ferry.md')
    fake.files.set('The Ferry.md', 'Edited in Obsidian.\n')
    expect(await manuscript.updateProperties({ status: 'revised' })).toBe(false)
    expect(store.saveState).toBe('conflict')
  })

  it('creates a chapter and opens it', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    fake.api.manuscript.getManuscript = () =>
      Promise.resolve({
        ok: true,
        value: {
          ...sampleManuscript,
          unordered: [
            ...sampleManuscript.unordered,
            {
              chapter: {
                path: 'The Mill.md',
                title: 'The Mill',
                wordCount: 0,
                duplicateOrder: false,
                pov: [],
                threads: []
              },
              reason: 'missing-order'
            }
          ]
        }
      })
    expect(await manuscript.createChapter('Part One.md', 'The Mill')).toBe(true)
    expect(fake.created).toEqual(['The Mill.md'])
    expect(store.entry?.path).toBe('The Mill.md')
  })
})

describe('manuscript store: moving and renaming', () => {
  it('saves typing before a move, then moves', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('First frost.md')
    store.edit('Typed before the drag.\n')
    expect(await manuscript.moveChapter('First frost.md', { part: 'Part One.md', index: 0 })).toBe(
      true
    )
    expect(fake.saves).toEqual(['Typed before the drag.\n'])
    expect(fake.moves).toEqual(['First frost.md → Part One.md#0'])
    expect(await manuscript.movePart('Part One.md', 0)).toBe(true)
    expect(await manuscript.moveChapter('The Ferry.md', null)).toBe(true)
    expect(fake.moves.slice(1)).toEqual(['Part One.md → #0', 'The Ferry.md → unordered'])
  })

  it('asks before renaming when the project says ask', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('First frost.md')
    fake.renamePlan.current = {
      newPath: 'Hoarfrost.md',
      newName: 'Hoarfrost.md',
      policy: 'ask',
      linkCount: 2,
      fileCount: 1
    }
    await manuscript.updateProperties({ title: 'Hoarfrost' })
    expect(store.pendingRename?.plan.newName).toBe('Hoarfrost.md')
    expect(fake.renames).toEqual([])

    expect(await store.renameEntry('First frost.md')).toBe(true)
    expect(fake.renames).toEqual(['First frost.md → Hoarfrost.md'])
    expect(store.entry?.path).toBe('Hoarfrost.md')
    expect(store.pendingRename).toBeNull()

    // The editor keeps saving to the renamed file.
    store.edit('Still writing.\n')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)
    expect(fake.files.get('Hoarfrost.md')).toBe('Still writing.\n')
  })

  it('renames without asking when the project says always, and never asks for nothing', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('First frost.md')
    await manuscript.updateProperties({ title: 'First frost' })
    expect(store.pendingRename).toBeNull()

    fake.renamePlan.current = {
      newPath: 'Hoarfrost.md',
      newName: 'Hoarfrost.md',
      policy: 'always',
      linkCount: 0,
      fileCount: 0
    }
    await manuscript.updateProperties({ title: 'Hoarfrost' })
    expect(fake.renames).toEqual(['First frost.md → Hoarfrost.md'])
    expect(store.pendingRename).toBeNull()
  })

  it('forgets a rename the writer declined', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('First frost.md')
    fake.renamePlan.current = {
      newPath: 'Hoarfrost.md',
      newName: 'Hoarfrost.md',
      policy: 'ask',
      linkCount: 0,
      fileCount: 0
    }
    await manuscript.updateProperties({ title: 'Hoarfrost' })
    store.dismissRename()
    expect(store.pendingRename).toBeNull()
    expect(fake.renames).toEqual([])
  })
})

describe('manuscript store: changes made in other programs', () => {
  const changed = [{ path: 'First frost.md', kind: 'changed' as const }]

  it('loads new text quietly when the writer has no unsaved typing', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    const revision = store.entry?.revision
    fake.files.set('First frost.md', 'Rewritten in Obsidian.\n')
    await store.syncFromDisk(changed)
    expect(store.text).toBe('Rewritten in Obsidian.\n')
    expect(store.entry?.revision).not.toBe(revision)
    expect(store.saveState).toBe('saved')
    expect(store.diskNotice).toContain('Updated from disk')

    // And the next save goes through: the version was picked up.
    store.edit('Then typed here.\n')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)
    expect(fake.files.get('First frost.md')).toBe('Then typed here.\n')
  })

  it('turns unsaved typing plus an outside edit into a conflict, overwriting nothing', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    store.edit('Mine, not saved yet.\n')
    fake.files.set('First frost.md', 'Theirs.\n')
    await store.syncFromDisk(changed)
    expect(store.saveState).toBe('conflict')
    expect(store.text).toBe('Mine, not saved yet.\n')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2)
    expect(fake.files.get('First frost.md')).toBe('Theirs.\n')

    await store.keepMine()
    expect(fake.files.get('First frost.md')).toBe('Mine, not saved yet.\n')
    expect(store.saveState).toBe('saved')
  })

  it('keeps unsaved typing when only the version changed (line endings or frontmatter)', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    store.edit('Typing on.\n')
    // The text stays the same but the file's version changes, as a CRLF→LF rewrite does.
    fake.touch('First frost.md')
    await store.syncFromDisk(changed)
    expect(store.saveState).not.toBe('conflict')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)
    expect(fake.files.get('First frost.md')).toBe('Typing on.\n')
  })

  it('ignores changes to other files', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    store.edit('Typing on.\n')
    fake.files.set('The Ferry.md', 'Elsewhere.\n')
    await store.syncFromDisk([{ path: 'The Ferry.md', kind: 'changed' }])
    expect(store.saveState).toBe('unsaved')
    expect(store.text).toBe('Typing on.\n')
  })

  it('keeps the text of a file deleted outside, and saves it as a new chapter', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    store.edit('Words worth keeping.\n')
    fake.files.delete('First frost.md')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'removed' }])
    expect(store.saveState).toBe('missing')
    expect(store.hasStuckChanges).toBe(true)
    expect(await store.open('The Ferry.md')).toBe(false)

    expect(await store.saveMissingAsNew()).toBe(true)
    expect(fake.created).toEqual(['First frost (recovered).md'])
    expect(store.entry?.path).toBe('First frost (recovered).md')
    expect(fake.files.get('First frost (recovered).md')).toBe('Words worth keeping.\n')
    expect(fake.files.has('First frost.md')).toBe(false)
    expect(store.saveState).toBe('saved')
  })

  it('lets the writer discard the text of a deleted file', async () => {
    const store = useEditorStore()
    await store.open('First frost.md')
    fake.files.delete('First frost.md')
    await store.syncFromDisk([{ path: 'First frost.md', kind: 'removed' }])
    store.discardMissing()
    expect(store.entry).toBeNull()
    expect(await store.open('The Ferry.md')).toBe(true)
  })
})

describe('manuscript store: fixing warnings', () => {
  it('saves the open text first, applies the fix, and picks up the changed file', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('The Ferry.md')
    store.edit('Typed at [[Marrow]].\n')
    // The main process rewrites the file; the fake stands in by changing its text.
    const fix = fake.api.manuscript.fixWarning.bind(fake.api.manuscript)
    fake.api.manuscript.fixWarning = async (path, chosen) => {
      fake.files.set('The Ferry.md', 'Typed at [[locations/Marrow|Marrow]].\n')
      return fix(path, chosen)
    }
    expect(
      await manuscript.fixWarning('The Ferry.md', {
        kind: 'path-form',
        name: 'Marrow',
        choice: 'locations/Marrow.md'
      })
    ).toBe(true)
    expect(fake.saves).toEqual(['Typed at [[Marrow]].\n'])
    expect(store.text).toBe('Typed at [[locations/Marrow|Marrow]].\n')
    expect(store.saveState).toBe('saved')
  })
})

describe('manuscript store: synopsis from the Overview', () => {
  it('saves typing in the open chapter first, then its synopsis, with no false conflict', async () => {
    const store = useEditorStore()
    const manuscript = useManuscriptStore()
    await store.open('The Ferry.md')
    store.edit('Typed before editing the synopsis.\n')
    expect(await manuscript.updateSynopsis('The Ferry.md', 'Ilka arrives.')).toBe(true)
    expect(fake.files.get('The Ferry.md')).toBe('Typed before editing the synopsis.\n')
    expect(fake.properties.get('The Ferry.md')?.synopsis).toBe('Ilka arrives.')
    expect(store.saveState).toBe('saved')
  })

  it('writes nothing when the synopsis didn’t change', async () => {
    const manuscript = useManuscriptStore()
    await manuscript.updateSynopsis('First frost.md', 'Frost.')
    const versionOf = async (): Promise<string | undefined> => {
      const read = await fake.api.manuscript.getEntryProperties('First frost.md')
      return read.ok ? read.value.version : undefined
    }
    const before = await versionOf()
    expect(await manuscript.updateSynopsis('First frost.md', ' Frost. ')).toBe(true)
    expect(await versionOf()).toBe(before)
  })
})
