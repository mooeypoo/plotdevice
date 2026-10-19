import { beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import type { ManuscriptSettings } from '../domain/manuscript-settings'
import { InMemoryManuscript } from '../domain/ports/in-memory-manuscript.fake'
import { createAddStatus } from './commands/add-status'
import { createCreateChapter, createCreatePart } from './commands/create-entries'
import { createRenumberPart } from './commands/renumber-part'
import { createSaveEntryText } from './commands/save-entry-text'
import { createUpdateEntryProperties } from './commands/update-entry-properties'
import { createGetEntryProperties } from './queries/get-entry-properties'
import { createGetManuscript } from './queries/get-manuscript'
import { createListStatuses } from './queries/list-statuses'
import { createOpenEntry } from './queries/open-entry'

const p = (value: string): ProjectPath => value as ProjectPath
const partOne = p('manuscript/Part One/Part One.md')
const ferry = p('manuscript/Part One/The Ferry.md')
const frost = p('manuscript/Part One/First frost.md')
const settings: ManuscriptSettings = {
  readOnly: false,
  partFolder: p('manuscript'),
  chapterFolder: p('manuscript'),
  fileNames: 'ask'
}

let repository: InMemoryManuscript

beforeEach(() => {
  repository = new InMemoryManuscript()
  repository.put(partOne, { type: 'part', title: 'Part One: The Orchard', order: 1 })
  repository.put(
    ferry,
    { type: 'chapter', part: '[[Part One]]', order: 1, status: 'draft' },
    'The ferry docked.\n'
  )
  repository.put(frost, { type: 'chapter', part: '[[Part One]]', order: 1 }, 'Frost.\n')
  repository.otherCandidates = [{ path: p('characters/Ilka Szabó.md'), type: 'character' }]
  repository.novel = { statuses: ['idea', 'draft'] }
})

describe('GetManuscript and OpenEntry', () => {
  it('arranges the files and passes the link candidates through', async () => {
    const view = await createGetManuscript({ repository })()
    expect(view.manuscript.parts[0]?.chapters.map((entry) => entry.chapter.title)).toEqual([
      'First frost',
      'The Ferry'
    ])
    expect(view.linkCandidates).toHaveLength(4)
  })

  it('returns the text, its version, and its word count', async () => {
    expect(await createOpenEntry({ repository })(ferry)).toMatchObject({
      ok: true,
      value: { text: 'The ferry docked.\n', wordCount: 3 }
    })
  })

  it('reports a missing file', async () => {
    expect(await createOpenEntry({ repository })(p('gone.md'))).toMatchObject({
      ok: false,
      error: { code: 'not-found' }
    })
  })
})

describe('SaveEntryText', () => {
  it('saves and returns the new word count', async () => {
    const opened = await createOpenEntry({ repository })(ferry)
    if (!opened.ok) throw new Error('setup')
    const save = createSaveEntryText({ repository, readOnly: false })
    expect(await save(ferry, 'The ferry nosed in.\n', opened.value.version, false)).toMatchObject({
      ok: true,
      value: { wordCount: 4 }
    })
    expect(repository.get(ferry)?.text).toBe('The ferry nosed in.\n')
  })

  it('refuses to overwrite a file that changed outside the app, unless told to', async () => {
    const opened = await createOpenEntry({ repository })(ferry)
    if (!opened.ok) throw new Error('setup')
    repository.editOutside(ferry, 'Edited in Obsidian.\n')
    const save = createSaveEntryText({ repository, readOnly: false })

    expect(await save(ferry, 'Mine.\n', opened.value.version, false)).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
    expect(repository.get(ferry)?.text).toBe('Edited in Obsidian.\n')
    expect(await save(ferry, 'Mine.\n', opened.value.version, true)).toMatchObject({ ok: true })
    expect(repository.get(ferry)?.text).toBe('Mine.\n')
  })

  it('refuses every save in a read-only project', async () => {
    const save = createSaveEntryText({ repository, readOnly: true })
    expect(await save(ferry, 'Mine.\n', 'v2', true)).toMatchObject({
      ok: false,
      error: { code: 'read-only' }
    })
  })
})

describe('properties', () => {
  it('reads properties with their version', async () => {
    expect(await createGetEntryProperties({ repository })(ferry)).toMatchObject({
      ok: true,
      value: { properties: { kind: 'chapter', status: 'draft', part: '[[Part One]]', order: '1' } }
    })
  })

  it('saves changes and returns the new properties and version', async () => {
    const before = await createGetEntryProperties({ repository })(ferry)
    if (!before.ok) throw new Error('setup')
    const update = createUpdateEntryProperties({ repository, settings })

    const result = await update(ferry, before.value.version, {
      status: 'revised',
      pov: ['Ilka Szabó']
    })

    expect(result).toMatchObject({
      ok: true,
      value: { properties: { status: 'revised', pov: ['[[Ilka Szabó]]'] } }
    })
    expect(repository.get(ferry)?.frontmatter).toMatchObject({
      status: 'revised',
      pov: '[[Ilka Szabó]]'
    })
  })

  it('refuses when the file changed since it was read', async () => {
    const update = createUpdateEntryProperties({ repository, settings })
    expect(await update(ferry, 'stale', { status: 'revised' })).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
    expect(repository.get(ferry)?.frontmatter['status']).toBe('draft')
  })

  it('refuses in a read-only project', async () => {
    const update = createUpdateEntryProperties({
      repository,
      settings: { ...settings, readOnly: true }
    })
    expect(await update(ferry, 'v2', { status: 'revised' })).toMatchObject({
      ok: false,
      error: { code: 'read-only' }
    })
  })
})

describe('creating entries', () => {
  it('creates a chapter at the end of a part, in the part’s folder', async () => {
    const result = await createCreateChapter({ repository, settings })(partOne, 'The Mill')
    expect(result).toMatchObject({ ok: true, value: { path: 'manuscript/Part One/The Mill.md' } })
    expect(repository.get('manuscript/Part One/The Mill.md')?.frontmatter).toEqual({
      type: 'chapter',
      title: 'The Mill',
      part: '[[Part One]]',
      order: 2
    })
  })

  it('names an empty title “Untitled chapter”, and never reuses a taken name', async () => {
    const create = createCreateChapter({ repository, settings })
    expect(await create(partOne, '  ')).toMatchObject({
      value: { path: 'manuscript/Part One/Untitled chapter.md' }
    })
    expect(await create(partOne, '')).toMatchObject({
      value: { path: 'manuscript/Part One/Untitled chapter (chapter).md' }
    })
    expect(await create(partOne, 'The Ferry')).toMatchObject({
      value: { path: 'manuscript/Part One/The Ferry (chapter).md' }
    })
  })

  it('creates a chapter without a part in the chapter folder', async () => {
    expect(await createCreateChapter({ repository, settings })(undefined, 'Loose')).toMatchObject({
      ok: true,
      value: { path: 'manuscript/Loose.md' }
    })
  })

  it('refuses a part that no longer exists', async () => {
    expect(await createCreateChapter({ repository, settings })(p('gone.md'), 'X')).toMatchObject({
      ok: false,
      error: { code: 'part-not-found' }
    })
  })

  it('creates a part in its own folder, after the others', async () => {
    const result = await createCreatePart({ repository, settings })('Part Two: The Cannery')
    const path = 'manuscript/Part Two - The Cannery/Part Two - The Cannery.md'
    expect(result).toMatchObject({ ok: true, value: { path } })
    expect(repository.get(path)?.frontmatter).toEqual({
      type: 'part',
      title: 'Part Two: The Cannery',
      order: 2
    })
  })
})

describe('RenumberPart', () => {
  it('rewrites only the orders that differ, in the current order', async () => {
    const result = await createRenumberPart({ repository, settings })(partOne)
    expect(result).toMatchObject({ ok: true, value: { failed: [] } })
    if (!result.ok) return
    // First frost sorts first (same order, earlier title), so only The Ferry changes.
    expect(Object.keys(result.value.versions)).toEqual([ferry])
    expect(repository.get(frost)?.frontmatter['order']).toBe(1)
    expect(repository.get(ferry)?.frontmatter['order']).toBe(2)
  })
})

describe('statuses', () => {
  it('lists the project’s statuses and adds one', async () => {
    expect(await createListStatuses({ repository })()).toEqual(['idea', 'draft'])
    expect(await createAddStatus({ repository, settings })('maybe')).toEqual({
      ok: true,
      value: ['idea', 'draft', 'maybe']
    })
    expect(repository.novel['statuses']).toEqual(['idea', 'draft', 'maybe'])
  })
})
