import { beforeEach, describe, expect, it } from 'vitest'
import { createSaveEntryText } from '../contexts/manuscript/application/commands/save-entry-text'
import { createGetManuscript } from '../contexts/manuscript/application/queries/get-manuscript'
import { createOpenEntry } from '../contexts/manuscript/application/queries/open-entry'
import { readChapter } from '../contexts/manuscript/domain/chapter'
import { readPart } from '../contexts/manuscript/domain/part'
import { InMemoryManuscript } from '../contexts/manuscript/domain/ports/in-memory-manuscript.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import {
  createManuscriptHandlers,
  type ManuscriptHandlers,
  type ManuscriptUseCases
} from './manuscript-handlers'

const partPath = 'manuscript/Part One.md' as ProjectPath
const arrival = 'manuscript/Arrival.md' as ProjectPath
const harbor = 'locations/Harbor.md' as ProjectPath

let repository: InMemoryManuscript
let session: ManuscriptUseCases | undefined
let handlers: ManuscriptHandlers

beforeEach(() => {
  repository = new InMemoryManuscript()
  repository.parts = [readPart(partPath, { title: 'Part One: The Harbor', order: 1 }, 'Epigraph.')]
  repository.chapters = [
    readChapter(arrival, { part: '[[Part One]]', order: 1, status: 'draft' }, 'Three words here.')
  ]
  repository.linkCandidates = [
    { path: partPath, type: 'part' },
    { path: arrival, type: 'chapter' },
    { path: harbor, type: 'location' }
  ]
  repository.setText(partPath, 'Epigraph.\n')
  repository.setText(arrival, 'Three words here.\n')
  repository.setText(harbor, 'A location, not a chapter.\n')

  session = {
    getManuscript: createGetManuscript({ repository }),
    openEntry: createOpenEntry({ repository }),
    saveEntryText: createSaveEntryText({ repository, readOnly: false })
  }
  handlers = createManuscriptHandlers(() => session)
})

describe('manuscript handlers', () => {
  it('maps the manuscript for the binder', async () => {
    expect(await handlers.getManuscript()).toEqual({
      ok: true,
      value: {
        parts: [
          {
            path: partPath,
            title: 'Part One: The Harbor',
            number: 1,
            wordCount: 4,
            chapters: [
              {
                path: arrival,
                title: 'Arrival',
                number: 1,
                status: 'draft',
                wordCount: 3,
                duplicateOrder: false
              }
            ]
          }
        ],
        unnumberedParts: [],
        chapters: [],
        unordered: [],
        warnings: [],
        wordCount: 4,
        linkTargets: [
          { name: 'Part One', type: 'part' },
          { name: 'Arrival', type: 'chapter' },
          { name: 'Harbor', type: 'location' }
        ]
      }
    })
  })

  it('opens and saves parts and chapters from the listing', async () => {
    await handlers.getManuscript()
    const opened = await handlers.openEntry([arrival])
    expect(opened).toMatchObject({ ok: true, value: { text: 'Three words here.\n', wordCount: 3 } })
    if (!opened.ok) return

    expect(
      await handlers.saveEntryText([arrival, 'Now four words here.\n', opened.value.version, false])
    ).toMatchObject({ ok: true, value: { wordCount: 4 } })
    expect(await handlers.openEntry([partPath])).toMatchObject({ ok: true })
  })

  it('refuses any other file, even one inside the project', async () => {
    await handlers.getManuscript()
    expect(await handlers.openEntry([harbor])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(await handlers.saveEntryText([harbor, 'x', 'v3', true])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(repository.texts.get(harbor)?.text).toBe('A location, not a chapter.\n')
  })

  it('refuses paths before the manuscript is listed, and traversal attempts', async () => {
    expect(await handlers.openEntry([arrival])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    await handlers.getManuscript()
    expect(await handlers.openEntry(['../novel.md'])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
  })

  it('passes a changed-on-disk refusal through', async () => {
    await handlers.getManuscript()
    repository.editOutside(arrival, 'Theirs.\n')
    expect(await handlers.saveEntryText([arrival, 'Mine.\n', 'v2', false])).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
  })

  it('reports when no project is open', async () => {
    session = undefined
    expect(await handlers.getManuscript()).toMatchObject({
      ok: false,
      error: { code: 'no-project' }
    })
  })

  it('forgets allowed paths when another project opens', async () => {
    await handlers.getManuscript()
    session = {
      getManuscript: createGetManuscript({ repository }),
      openEntry: createOpenEntry({ repository }),
      saveEntryText: createSaveEntryText({ repository, readOnly: false })
    }
    expect(await handlers.openEntry([arrival])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
  })

  it.each([[[]], [[42]], [[arrival, 'text', 'v1']], [[arrival, 'text', 'v1', 'yes']]])(
    'rejects malformed save arguments %j',
    async (args) => {
      await handlers.getManuscript()
      expect(await handlers.saveEntryText(args)).toMatchObject({
        ok: false,
        error: { code: 'invalid-request' }
      })
    }
  )
})
