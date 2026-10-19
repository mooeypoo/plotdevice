import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from './codex-store'
import { AUTOSAVE_DELAY_MS, useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('codex store', () => {
  it('opens a character in the editor, with its properties and appearances', async () => {
    const editor = useEditorStore()
    const codex = useCodexStore()
    expect(await editor.open('characters/Ilka.md')).toBe(true)
    expect(editor.entry).toMatchObject({ kind: 'character', label: 'Character', title: 'Ilka' })
    expect(editor.text).toBe('Ilka grafts pear trees.\n')
    expect(codex.properties).toMatchObject({ role: 'lead', aliases: ['Ilk'] })
    expect(codex.appearsIn).toEqual([{ path: 'The Ferry.md', title: 'The Ferry', keys: ['pov'] }])
    // The manuscript's properties aren't touched by a codex entry.
    expect(useManuscriptStore().properties).toBeNull()
  })

  it('saves a codex entry’s text like a chapter’s', async () => {
    const editor = useEditorStore()
    await editor.open('locations/Marrow.md')
    editor.edit('A village on the salt marsh.\n')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)
    expect(fake.files.get('locations/Marrow.md')).toBe('A village on the salt marsh.\n')
  })

  it('saves typing first, then a property change, with no false conflict', async () => {
    const editor = useEditorStore()
    const codex = useCodexStore()
    await editor.open('characters/Ilka.md')
    editor.edit('Typed.\n')
    expect(await codex.updateProperties({ aliases: ['Ilk', 'Ili'] })).toBe(true)
    expect(codex.properties?.aliases).toEqual(['Ilk', 'Ili'])
    expect(fake.files.get('characters/Ilka.md')).toBe('Typed.\n')
    expect(editor.saveState).toBe('saved')
  })

  it('offers a rename after a name change', async () => {
    const editor = useEditorStore()
    await editor.open('characters/Ilka.md')
    fake.renamePlan.current = {
      newPath: 'characters/Ilka Szabó.md',
      newName: 'Ilka Szabó.md',
      policy: 'ask',
      linkCount: 4,
      fileCount: 3
    }
    await useCodexStore().updateProperties({ title: 'Ilka Szabó' })
    expect(editor.pendingRename?.plan.linkCount).toBe(4)
  })

  it('creates an entry and opens it', async () => {
    const editor = useEditorStore()
    expect(await useCodexStore().createEntry('character', 'Marta')).toBe(true)
    expect(fake.codexWrites).toEqual(['created characters/Marta.md'])
    expect(editor.entry).toMatchObject({ path: 'characters/Marta.md', kind: 'character' })
  })

  it('sets the type of an untyped file and lists it no more', async () => {
    const codex = useCodexStore()
    expect(await codex.setEntryType('Loose thoughts.md', 'note')).toBe(true)
    expect(fake.codexWrites).toEqual(['Loose thoughts.md → note'])
    expect(codex.listing?.untyped).toEqual([])
  })
})

describe('codex store: templates', () => {
  it('opens a template in the editor, with no properties, and saves its text', async () => {
    const editor = useEditorStore()
    const codex = useCodexStore()
    expect(await codex.editTemplate('character')).toBe(true)
    expect(fake.codexWrites).toEqual(['template character'])
    expect(editor.entry).toMatchObject({
      kind: 'template',
      title: 'Character template',
      templateOf: 'character'
    })
    expect(codex.properties).toBeNull()
    editor.edit('## Voice\n')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)
    expect(fake.files.get('templates/character.md')).toBe('## Voice\n')
  })
})
