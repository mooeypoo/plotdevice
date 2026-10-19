import { beforeEach, describe, expect, it } from 'vitest'
import { createCheckStoryDate } from '../contexts/chronology/application/queries/check-story-date'
import { describeStoryDateReading } from '../contexts/chronology/domain/story-date'
import { createAddStatus } from '../contexts/manuscript/application/commands/add-status'
import {
  createCreateChapter,
  createCreatePart
} from '../contexts/manuscript/application/commands/create-entries'
import {
  createMoveChapter,
  createMovePart
} from '../contexts/manuscript/application/commands/move-entries'
import {
  createPlanRename,
  createRenameEntry
} from '../contexts/manuscript/application/commands/rename-entry'
import { createRenumberPart } from '../contexts/manuscript/application/commands/renumber-part'
import { createSaveEntryText } from '../contexts/manuscript/application/commands/save-entry-text'
import { createUpdateEntryProperties } from '../contexts/manuscript/application/commands/update-entry-properties'
import { createGetEntryProperties } from '../contexts/manuscript/application/queries/get-entry-properties'
import { createGetManuscript } from '../contexts/manuscript/application/queries/get-manuscript'
import { createOpenEntry } from '../contexts/manuscript/application/queries/open-entry'
import type { ManuscriptSettings } from '../contexts/manuscript/domain/manuscript-settings'
import { InMemoryManuscript } from '../contexts/manuscript/domain/ports/in-memory-manuscript.fake'
import { InMemoryRelocator } from '../contexts/manuscript/domain/ports/in-memory-relocator.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { createInspectorHandlers } from './inspector-handlers'
import {
  createManuscriptHandlers,
  type ManuscriptHandlers,
  type ManuscriptUseCases
} from './manuscript-handlers'

const p = (value: string): ProjectPath => value as ProjectPath
const partOne = p('manuscript/Part One.md')
const ferry = p('manuscript/The Ferry.md')
const marrow = p('locations/Marrow.md')
const settings: ManuscriptSettings = {
  readOnly: false,
  partFolder: p('manuscript'),
  chapterFolder: p('manuscript'),
  fileNames: 'ask'
}

let repository: InMemoryManuscript
let session: ManuscriptUseCases | undefined
let handlers: ManuscriptHandlers

function useCasesFor(repo: InMemoryManuscript): ManuscriptUseCases {
  const relocator = new InMemoryRelocator(repo)
  return {
    getManuscript: createGetManuscript({ repository: repo }),
    openEntry: createOpenEntry({ repository: repo }),
    saveEntryText: createSaveEntryText({ repository: repo, readOnly: false }),
    getEntryProperties: createGetEntryProperties({ repository: repo }),
    updateEntryProperties: createUpdateEntryProperties({ repository: repo, settings }),
    createChapter: createCreateChapter({ repository: repo, settings }),
    createPart: createCreatePart({ repository: repo, settings }),
    renumberPart: createRenumberPart({ repository: repo, settings }),
    addStatus: createAddStatus({ repository: repo, settings }),
    moveChapter: createMoveChapter({ repository: repo, relocator, settings }),
    movePart: createMovePart({ repository: repo, settings }),
    planRename: createPlanRename({ repository: repo, relocator, settings }),
    renameEntry: createRenameEntry({ repository: repo, relocator, settings })
  }
}

beforeEach(() => {
  repository = new InMemoryManuscript()
  repository.put(partOne, { type: 'part', title: 'Part One: The Orchard', order: 1 }, 'Epigraph.')
  repository.put(
    ferry,
    { type: 'chapter', part: '[[Part One]]', order: 1, status: 'draft' },
    'Three words here.\n'
  )
  repository.otherCandidates = [{ path: marrow, type: 'location' }]
  session = useCasesFor(repository)
  handlers = createManuscriptHandlers(() => session)
})

describe('manuscript handlers', () => {
  it('maps the manuscript for the binder, including each chapter’s order', async () => {
    const result = await handlers.getManuscript()
    expect(result).toMatchObject({
      ok: true,
      value: {
        parts: [
          {
            path: partOne,
            title: 'Part One: The Orchard',
            number: 1,
            order: 1,
            chapters: [{ path: ferry, title: 'The Ferry', number: 1, order: 1, status: 'draft' }]
          }
        ]
      }
    })
    expect(result.ok && result.value.linkTargets).toContainEqual({
      name: 'Marrow',
      type: 'location'
    })
  })

  it('opens and saves parts and chapters from the listing', async () => {
    await handlers.getManuscript()
    const opened = await handlers.openEntry([ferry])
    expect(opened).toMatchObject({ ok: true, value: { text: 'Three words here.\n', wordCount: 3 } })
    if (!opened.ok) return
    expect(
      await handlers.saveEntryText([ferry, 'Now four words here.\n', opened.value.version, false])
    ).toMatchObject({ ok: true, value: { wordCount: 4 } })
  })

  it('refuses any other file, even one inside the project', async () => {
    await handlers.getManuscript()
    const refused = { ok: false, error: { code: 'entry-not-allowed' } }
    expect(await handlers.openEntry([marrow])).toMatchObject(refused)
    expect(await handlers.getEntryProperties([marrow])).toMatchObject(refused)
    expect(await handlers.updateEntryProperties([marrow, 'v1', { title: 'x' }])).toMatchObject(
      refused
    )
    expect(await handlers.openEntry(['../novel.md'])).toMatchObject(refused)
  })

  it('refuses paths before the manuscript is listed', async () => {
    expect(await handlers.openEntry([ferry])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
  })

  it('reads and updates properties', async () => {
    await handlers.getManuscript()
    const read = await handlers.getEntryProperties([ferry])
    expect(read).toMatchObject({ ok: true, value: { properties: { status: 'draft', order: '1' } } })
    if (!read.ok) return
    expect(
      await handlers.updateEntryProperties([
        ferry,
        read.value.version,
        { status: 'revised', location: ['Marrow'] }
      ])
    ).toMatchObject({
      ok: true,
      value: { properties: { status: 'revised', location: ['[[Marrow]]'] } }
    })
  })

  it('changes and removes a chapter’s order', async () => {
    await handlers.getManuscript()
    const read = await handlers.getEntryProperties([ferry])
    if (!read.ok) return
    const moved = await handlers.updateEntryProperties([ferry, read.value.version, { order: 4 }])
    expect(moved).toMatchObject({ ok: true, value: { properties: { order: '4' } } })
    if (!moved.ok) return
    const removed = await handlers.updateEntryProperties([
      ferry,
      moved.value.version,
      { order: null }
    ])
    expect(removed.ok && removed.value.properties).not.toHaveProperty('order')
    expect(repository.get(ferry)?.frontmatter).not.toHaveProperty('order')
  })

  it('rejects unknown property names and malformed values', async () => {
    await handlers.getManuscript()
    const invalid = { ok: false, error: { code: 'invalid-request' } }
    expect(await handlers.updateEntryProperties([ferry, 'v1', { order: 2.5 }])).toMatchObject(
      invalid
    )
    expect(await handlers.updateEntryProperties([ferry, 'v1', { part: 'x' }])).toMatchObject(
      invalid
    )
    expect(await handlers.updateEntryProperties([ferry, 'v1', { pov: 'Ilka' }])).toMatchObject(
      invalid
    )
  })

  it('creates a chapter in a listed part, and allows opening it right away', async () => {
    await handlers.getManuscript()
    expect(await handlers.createChapter([partOne, 'The Mill'])).toEqual({
      ok: true,
      value: { path: 'manuscript/The Mill.md' }
    })
    expect(await handlers.openEntry(['manuscript/The Mill.md'])).toMatchObject({ ok: true })
  })

  it('refuses to create a chapter in something that is not a listed part', async () => {
    await handlers.getManuscript()
    expect(await handlers.createChapter([marrow, 'X'])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(await handlers.createChapter([null, 'Loose'])).toMatchObject({ ok: true })
  })

  it('creates a part, renumbers, and adds a status', async () => {
    await handlers.getManuscript()
    expect(await handlers.createPart(['Part Two'])).toMatchObject({ ok: true })
    expect(await handlers.renumberPart([partOne])).toEqual({
      ok: true,
      value: { changed: 0, failed: [] }
    })
    expect(await handlers.addStatus(['maybe'])).toMatchObject({ ok: true })
  })

  it('moves chapters and parts by listed paths only', async () => {
    await handlers.getManuscript()
    expect(await handlers.moveChapter([ferry, { part: partOne, index: 0 }])).toEqual({
      ok: true,
      value: { path: ferry, changed: 0, failed: [] }
    })
    expect(await handlers.moveChapter([ferry, null])).toMatchObject({ ok: true })
    expect(await handlers.moveChapter([ferry, { part: marrow, index: 0 }])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(await handlers.moveChapter([ferry, { part: partOne, index: -1 }])).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
    expect(await handlers.movePart([partOne, 0])).toMatchObject({ ok: true })
  })

  it('plans no rename for an entry without a title', async () => {
    await handlers.getManuscript()
    expect(await handlers.planRename([ferry])).toEqual({ ok: true, value: null })
  })

  it('renames a part and updates the links to it', async () => {
    const before = repository.get(partOne)
    if (before === undefined) return
    before.frontmatter['title'] = 'The Orchard'
    await handlers.getManuscript()
    const newPath = 'manuscript/The Orchard.md'
    expect(await handlers.planRename([partOne])).toMatchObject({
      ok: true,
      value: { newPath, newName: 'The Orchard.md', linkCount: 1, fileCount: 1 }
    })
    expect(await handlers.renameEntry([partOne])).toEqual({
      ok: true,
      value: { path: newPath, linkCount: 1, fileCount: 1, skipped: [] }
    })
    expect(await handlers.openEntry([newPath])).toMatchObject({ ok: true })
  })

  it('passes a changed-on-disk refusal through', async () => {
    await handlers.getManuscript()
    const opened = await handlers.openEntry([ferry])
    if (!opened.ok) return
    repository.editOutside(ferry, 'Theirs.\n')
    expect(
      await handlers.saveEntryText([ferry, 'Mine.\n', opened.value.version, false])
    ).toMatchObject({ ok: false, error: { code: 'changed-on-disk' } })
  })

  it('reports when no project is open', async () => {
    session = undefined
    expect(await handlers.getManuscript()).toMatchObject({
      ok: false,
      error: { code: 'no-project' }
    })
    expect(await handlers.createPart(['x'])).toMatchObject({
      ok: false,
      error: { code: 'no-project' }
    })
  })

  it('forgets allowed paths when another project opens', async () => {
    await handlers.getManuscript()
    session = useCasesFor(repository)
    expect(await handlers.openEntry([ferry])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
  })

  it.each([[[]], [[42]], [[ferry, 'text', 'v1']], [[ferry, 'text', 'v1', 'yes']]])(
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

describe('inspector handlers', () => {
  const inspector = createInspectorHandlers(() => ({
    getVocabulary: () =>
      Promise.resolve({
        statuses: ['idea'],
        threads: [{ key: 'main', name: 'Main plot' }],
        calendar: 'gregorian' as const
      }),
    checkStoryDate: createCheckStoryDate({
      getSettings: () => Promise.resolve({ calendar: 'gregorian', threads: [] })
    }),
    describeStoryDate: describeStoryDateReading
  }))

  it('returns the vocabulary', async () => {
    expect(await inspector.getVocabulary()).toEqual({
      ok: true,
      value: {
        statuses: ['idea'],
        threads: [{ key: 'main', name: 'Main plot' }],
        calendar: 'gregorian'
      }
    })
  })

  it('describes a valid date and explains an invalid one', async () => {
    expect(await inspector.checkStoryDate(['1952-10-03'])).toEqual({
      ok: true,
      value: { kind: 'date', description: '3 October 1952' }
    })
    expect(await inspector.checkStoryDate(['1952-02-30'])).toMatchObject({
      ok: true,
      value: { kind: 'invalid' }
    })
    expect(await inspector.checkStoryDate([42])).toMatchObject({ ok: false })
  })
})
