import { beforeEach, describe, expect, it } from 'vitest'
import type { EntryRelocator } from '../../../shared-kernel/entry-relocator'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { ok } from '../../../shared-kernel/result'
import type { CodexSettings } from '../domain/codex-settings'
import { InMemoryCodex } from '../domain/ports/in-memory-codex.fake'
import { createCreateCodexEntry } from './commands/create-codex-entry'
import { createCreateOutline } from './commands/create-outline'
import { createEditTemplate } from './commands/edit-template'
import { createPlanCodexRename, createRenameCodexEntry } from './commands/rename-codex-entry'
import { createSaveCodexText } from './commands/save-codex-text'
import { createSetEntryType } from './commands/set-entry-type'
import { createUpdateCodexProperties } from './commands/update-codex-properties'
import { createGetCodexProperties } from './queries/get-codex-properties'
import { createListCodex } from './queries/list-codex'
import { createOpenCodexEntry } from './queries/open-codex-entry'

const p = (value: string): ProjectPath => value as ProjectPath
const ilka = p('characters/Ilka Szabó.md')
const marrow = p('locations/Marrow.md')
const settings: CodexSettings = {
  readOnly: false,
  folders: { character: p('characters'), location: p('locations'), note: p('notes') },
  templateFolder: p('templates'),
  fileNames: 'ask'
}

let repository: InMemoryCodex
const moves: string[] = []
const relocator: EntryRelocator = {
  preview: () => Promise.resolve({ changedFiles: [p('a.md')], linkCount: 3, skipped: [] }),
  relocate: (from, to) => {
    const file = repository.files.get(from)
    if (file !== undefined) {
      repository.files.delete(from)
      repository.files.set(to, file)
    }
    moves.push(`${from} → ${to}`)
    return Promise.resolve(ok({ changedFiles: [], linkCount: 0, skipped: [] }))
  }
}

beforeEach(() => {
  moves.length = 0
  repository = new InMemoryCodex()
  repository.put(ilka, { type: 'character', title: 'Ilka Szabó', role: 'protagonist' }, 'Bio.\n')
  repository.put(p('characters/Aunt Bea.md'), { type: 'character' })
  repository.put(marrow, { type: 'location' })
  repository.put(p('notes/Research.md'), { type: 'note' })
  repository.put(p('manuscript/The Ferry.md'), { type: 'chapter' })
  repository.put(p('Loose thoughts.md'), {})
  repository.put(p('notes/Unknown type.md'), { type: 'spaceship' })
})

describe('ListCodex', () => {
  it('lists entries by title and the untyped files', async () => {
    const listing = await createListCodex({ repository, settings })()
    expect(listing.entries.map((entry) => entry.title)).toEqual([
      'Aunt Bea',
      'Ilka Szabó',
      'Marrow',
      'Research'
    ])
    expect(listing.untyped).toEqual([
      { path: 'Loose thoughts.md' },
      { path: 'notes/Unknown type.md', rawType: 'spaceship' }
    ])
  })
})

describe('opening, saving, and properties', () => {
  it('opens and saves a body, refusing a stale version', async () => {
    const opened = await createOpenCodexEntry({ repository })(ilka)
    expect(opened).toMatchObject({ ok: true, value: { text: 'Bio.\n', wordCount: 1 } })
    if (!opened.ok) return
    const save = createSaveCodexText({ repository, readOnly: false })
    expect(await save(ilka, 'New bio.\n', opened.value.version, false)).toMatchObject({ ok: true })
    expect(await save(ilka, 'Again.\n', opened.value.version, false)).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
  })

  it('reads and updates properties', async () => {
    const read = await createGetCodexProperties({ repository })(ilka)
    if (!read.ok) throw new Error('expected properties')
    const updated = await createUpdateCodexProperties({ repository, settings })(
      ilka,
      read.value.version,
      { aliases: ['Ilk'], born: '1931', role: '' }
    )
    expect(updated).toMatchObject({
      ok: true,
      value: { properties: { aliases: ['Ilk'], born: '1931' } }
    })
    expect(repository.get(ilka)?.frontmatter).toEqual({
      type: 'character',
      title: 'Ilka Szabó',
      aliases: ['Ilk'],
      born: 1931
    })
  })
})

describe('CreateCodexEntry', () => {
  it('creates an entry in its folder with a unique name', async () => {
    const create = createCreateCodexEntry({ repository, settings })
    expect(await create('character', 'Marta')).toEqual({
      ok: true,
      value: { path: 'characters/Marta.md' }
    })
    expect(await create('character', 'Marrow')).toEqual({
      ok: true,
      value: { path: 'characters/Marrow (character).md' }
    })
    expect(await create('note', '')).toEqual({
      ok: true,
      value: { path: 'notes/Untitled note.md' }
    })
    expect(repository.get('characters/Marta.md')?.frontmatter).toEqual({
      type: 'character',
      title: 'Marta'
    })
  })

  it('refuses in a read-only project', async () => {
    expect(
      await createCreateCodexEntry({ repository, settings: { ...settings, readOnly: true } })(
        'note',
        'x'
      )
    ).toMatchObject({ ok: false, error: { code: 'read-only' } })
  })
})

describe('SetEntryType', () => {
  it('types an untyped file, writing only `type`', async () => {
    const setType = createSetEntryType({ repository, settings })
    expect(await setType(p('Loose thoughts.md'), 'note')).toEqual({ ok: true, value: undefined })
    expect(repository.get('Loose thoughts.md')?.frontmatter).toEqual({ type: 'note' })
    expect(await setType(ilka, 'location')).toMatchObject({
      ok: false,
      error: { code: 'not-untyped' }
    })
  })
})

describe('renaming to match the title', () => {
  it('plans and renames', async () => {
    const file = repository.get(marrow)
    if (file !== undefined) file.frontmatter['title'] = 'Marrow Village'
    expect(await createPlanCodexRename({ repository, relocator, settings })(marrow)).toEqual({
      ok: true,
      value: { newPath: 'locations/Marrow Village.md', policy: 'ask', linkCount: 3, fileCount: 1 }
    })
    expect(await createRenameCodexEntry({ repository, relocator, settings })(marrow)).toMatchObject(
      { ok: true, value: { path: 'locations/Marrow Village.md' } }
    )
    expect(moves).toEqual(['locations/Marrow.md → locations/Marrow Village.md'])
  })

  it('plans nothing when names follow the title, or renames are off', async () => {
    expect(await createPlanCodexRename({ repository, relocator, settings })(ilka)).toEqual({
      ok: true,
      value: null
    })
    expect(
      await createPlanCodexRename({
        repository,
        relocator,
        settings: { ...settings, fileNames: 'never' }
      })(marrow)
    ).toEqual({ ok: true, value: null })
  })
})

describe('templates', () => {
  it('lists templates apart from entries and untyped files', async () => {
    repository.put('templates/character.md', {}, '## Voice\n')
    repository.put('templates/old/stray.md', { type: 'character' })
    const listing = await createListCodex({ repository, settings })()
    expect(listing.templates).toEqual([
      { kind: 'character', path: 'templates/character.md', exists: true },
      { kind: 'location', path: 'templates/location.md', exists: false },
      { kind: 'note', path: 'templates/note.md', exists: false }
    ])
    expect(listing.entries.some((entry) => entry.path.startsWith('templates/'))).toBe(false)
    expect(listing.untyped.some((file) => file.path.startsWith('templates/'))).toBe(false)
  })

  it('starts new entries from the project’s template', async () => {
    repository.rawTexts.set('templates/character.md', '---\nrole:\n---\n## Voice\n')
    repository.put('templates/character.md', {})
    await createCreateCodexEntry({ repository, settings })('character', 'Marta')
    expect(repository.get('characters/Marta.md')).toMatchObject({
      frontmatter: { type: 'character', title: 'Marta' },
      text: '## Voice\n'
    })
  })

  it('writes the default template once, when the writer first edits it', async () => {
    const editTemplate = createEditTemplate({ repository, settings })
    expect(await editTemplate('location')).toEqual({
      ok: true,
      value: { path: 'templates/location.md' }
    })
    expect(repository.get('templates/location.md')?.text).toBe('## Description\n\n## History\n')
    repository.rawTexts.set('templates/location.md', 'Mine.\n')
    await editTemplate('location')
    expect(await repository.readFileText(p('templates/location.md'))).toBe('Mine.\n')
  })
})

describe('outlines', () => {
  it('creates outlines at the root and lists them by title', async () => {
    const create = createCreateOutline({ repository, settings })
    expect(await create('')).toEqual({ ok: true, value: { path: 'Outline.md' } })
    expect(await create('Revision plan')).toEqual({ ok: true, value: { path: 'Revision plan.md' } })
    expect(repository.get('Outline.md')?.frontmatter).toEqual({ type: 'outline', title: 'Outline' })
    repository.put('templates/old outline.md', { type: 'outline', title: 'Old' })
    const listing = await createListCodex({ repository, settings })()
    expect(listing.outlines).toEqual([
      { path: 'Outline.md', title: 'Outline' },
      { path: 'Revision plan.md', title: 'Revision plan' }
    ])
    expect(listing.entries.some((entry) => entry.path === 'Outline.md')).toBe(false)
  })
})
