import { beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { readChapter } from '../domain/chapter'
import { readPart } from '../domain/part'
import { InMemoryManuscript } from '../domain/ports/in-memory-manuscript.fake'
import { createSaveEntryText } from './commands/save-entry-text'
import { createGetManuscript } from './queries/get-manuscript'
import { createOpenEntry } from './queries/open-entry'

const arrival = 'manuscript/The Ferry.md' as ProjectPath
let repository: InMemoryManuscript

beforeEach(() => {
  repository = new InMemoryManuscript()
  const partPath = 'manuscript/Part One.md' as ProjectPath
  repository.parts = [readPart(partPath, { type: 'part', order: 1 }, '')]
  repository.chapters = [
    readChapter(arrival, { type: 'chapter', part: '[[Part One]]', order: 1 }, 'The ferry docked.')
  ]
  repository.linkCandidates = [
    { path: partPath, type: 'part' },
    { path: arrival, type: 'chapter' }
  ]
  repository.setText(arrival, 'The ferry docked.\n')
})

describe('GetManuscript', () => {
  it('arranges the files and passes the link candidates through', async () => {
    const view = await createGetManuscript({ repository })()
    expect(view.manuscript.parts[0]?.chapters[0]?.chapter.title).toBe('The Ferry')
    expect(view.linkCandidates).toHaveLength(2)
  })
})

describe('OpenEntry', () => {
  it('returns the text, its version, and its word count', async () => {
    expect(await createOpenEntry({ repository })(arrival)).toEqual({
      ok: true,
      value: { path: arrival, text: 'The ferry docked.\n', version: 'v1', wordCount: 3 }
    })
  })

  it('reports a missing file', async () => {
    expect(await createOpenEntry({ repository })('gone.md' as ProjectPath)).toMatchObject({
      ok: false,
      error: { code: 'not-found' }
    })
  })
})

describe('SaveEntryText', () => {
  it('saves and returns the new version and word count', async () => {
    const save = createSaveEntryText({ repository, readOnly: false })
    expect(await save(arrival, 'The ferry nosed into the jetty.\n', 'v1', false)).toEqual({
      ok: true,
      value: { version: 'v2', wordCount: 6 }
    })
    expect(repository.texts.get(arrival)?.text).toBe('The ferry nosed into the jetty.\n')
  })

  it('refuses to overwrite a file that changed outside the app', async () => {
    repository.editOutside(arrival, 'Edited in Obsidian.\n')
    const save = createSaveEntryText({ repository, readOnly: false })

    expect(await save(arrival, 'Mine.\n', 'v1', false)).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
    expect(repository.texts.get(arrival)?.text).toBe('Edited in Obsidian.\n')
  })

  it('overwrites when asked to keep the writer’s version', async () => {
    repository.editOutside(arrival, 'Edited in Obsidian.\n')
    const save = createSaveEntryText({ repository, readOnly: false })
    expect(await save(arrival, 'Mine.\n', 'v1', true)).toMatchObject({ ok: true })
    expect(repository.texts.get(arrival)?.text).toBe('Mine.\n')
  })

  it('refuses every save in a read-only project', async () => {
    const save = createSaveEntryText({ repository, readOnly: true })
    expect(await save(arrival, 'Mine.\n', 'v1', true)).toMatchObject({
      ok: false,
      error: { code: 'read-only' }
    })
    expect(repository.texts.get(arrival)?.text).toBe('The ferry docked.\n')
  })
})
