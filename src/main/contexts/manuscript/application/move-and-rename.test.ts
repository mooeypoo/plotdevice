import { beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import type { ManuscriptSettings } from '../domain/manuscript-settings'
import { InMemoryManuscript } from '../domain/ports/in-memory-manuscript.fake'
import { InMemoryRelocator } from '../domain/ports/in-memory-relocator.fake'
import { createMoveChapter, createMovePart } from './commands/move-entries'
import { createPlanRename, createRenameEntry } from './commands/rename-entry'
import { createRenumberPart } from './commands/renumber-part'

const p = (value: string): ProjectPath => value as ProjectPath
const partOne = p('manuscript/Part One/Part One.md')
const partTwo = p('manuscript/Part Two/Part Two.md')
const ferry = p('manuscript/Part One/The Ferry.md')
const frost = p('manuscript/Part One/First frost.md')
const orchard = p('manuscript/Part One/The Orchard.md')
const elsewhere = p('drafts/Loose ends.md')
const settings: ManuscriptSettings = {
  readOnly: false,
  partFolder: p('manuscript'),
  chapterFolder: p('manuscript'),
  fileNames: 'ask'
}

let repository: InMemoryManuscript
let relocator: InMemoryRelocator

beforeEach(() => {
  repository = new InMemoryManuscript()
  relocator = new InMemoryRelocator(repository)
  repository.put(partOne, { type: 'part', title: 'Part One', order: 1 })
  repository.put(partTwo, { type: 'part', title: 'Part Two', order: 2 })
  repository.put(ferry, { type: 'chapter', title: 'The Ferry', part: '[[Part One]]', order: 1 })
  repository.put(frost, { type: 'chapter', title: 'First frost', part: '[[Part One]]', order: 2 })
  repository.put(orchard, { type: 'chapter', title: 'The Orchard', part: '[[Part One]]', order: 3 })
  repository.put(elsewhere, {
    type: 'chapter',
    title: 'Loose ends',
    part: '[[Part One]]',
    order: 4
  })
})

const moveChapter = (
  overrides: Partial<ManuscriptSettings> = {}
): ReturnType<typeof createMoveChapter> =>
  createMoveChapter({ repository, relocator, settings: { ...settings, ...overrides } })
const retitle = (path: ProjectPath, title: string): void => {
  const file = repository.get(path)
  if (file !== undefined) file.frontmatter['title'] = title
}
const order = (path: ProjectPath): unknown => repository.get(path)?.frontmatter['order']

describe('MoveChapter within a part', () => {
  it('returns distinct semantic missing-entry and destination refusals without changing files', async () => {
    const before = [...repository.files.entries()].map(([path, file]) => [
      path,
      JSON.stringify(file)
    ])
    expect(await moveChapter()(p('Missing.md'), null)).toMatchObject({
      ok: false,
      error: { code: 'not-found', diagnostic: { reason: 'chapter-missing' } }
    })
    expect(await moveChapter()(ferry, { part: p('Missing.md'), index: 0 })).toMatchObject({
      ok: false,
      error: { code: 'part-not-found', diagnostic: { reason: 'part-missing' } }
    })
    expect(await moveChapter()(ferry, { part: undefined, index: 0 })).toMatchObject({
      ok: false,
      error: { code: 'part-required', diagnostic: { reason: 'part-required' } }
    })
    expect(await createMovePart({ repository, settings })(p('Missing.md'), 0)).toMatchObject({
      ok: false,
      error: { code: 'not-found', diagnostic: { reason: 'part-missing' } }
    })
    expect(await createRenumberPart({ repository, settings })(p('Missing.md'))).toMatchObject({
      ok: false,
      error: { code: 'part-not-found', diagnostic: { reason: 'part-missing' } }
    })
    expect(
      [...repository.files.entries()].map(([path, file]) => [path, JSON.stringify(file)])
    ).toEqual(before)
  })

  it('retains semantic read-only refusals for every structural command', async () => {
    const ports = { repository, relocator, settings: { ...settings, readOnly: true } }
    for (const result of [
      await createMoveChapter(ports)(ferry, null),
      await createMovePart(ports)(partOne, 0),
      await createRenumberPart(ports)(partOne),
      await createRenameEntry(ports)(ferry)
    ])
      expect(result).toMatchObject({
        ok: false,
        error: { code: 'read-only', diagnostic: { reason: 'read-only' } }
      })
    expect(relocator.moves).toEqual([])
  })

  it('rewrites only the orders that change', async () => {
    const versions = () =>
      [ferry, frost, orchard, elsewhere].map((path) => repository.get(path)?.version)
    const before = versions()
    const moved = await moveChapter()(orchard, { part: partOne, index: 1 })

    expect(moved).toEqual({ ok: true, value: { path: orchard, changed: 2, failed: [] } })
    expect([ferry, orchard, frost, elsewhere].map(order)).toEqual([1, 2, 3, 4])
    const after = versions()
    expect(after[0]).toBe(before[0])
    expect(after[3]).toBe(before[3])
    expect(relocator.moves).toEqual([])
  })

  it('does nothing when the chapter is already there', async () => {
    expect(await moveChapter()(ferry, { part: partOne, index: 0 })).toMatchObject({
      ok: true,
      value: { changed: 0 }
    })
  })
})

describe('MoveChapter to another part', () => {
  it('updates part and order, and moves a file that sat in the old part’s folder', async () => {
    repository.put(p('manuscript/Part Two/Low tide.md'), {
      type: 'chapter',
      part: '[[Part Two]]',
      order: 1
    })
    const moved = await moveChapter()(frost, { part: partTwo, index: 0 })

    const newPath = p('manuscript/Part Two/First frost.md')
    expect(moved).toMatchObject({ ok: true, value: { path: newPath } })
    expect(repository.get(newPath)?.frontmatter).toMatchObject({ part: '[[Part Two]]', order: 1 })
    expect(order(p('manuscript/Part Two/Low tide.md'))).toBe(2)
    // The old part keeps its gap; nothing there is rewritten.
    expect([ferry, orchard].map(order)).toEqual([1, 3])
  })

  it('leaves a file the writer filed elsewhere where it is', async () => {
    const moved = await moveChapter()(elsewhere, { part: partTwo, index: 0 })
    expect(moved).toMatchObject({ ok: true, value: { path: elsewhere } })
    expect(repository.get(elsewhere)?.frontmatter).toMatchObject({ part: '[[Part Two]]', order: 1 })
    expect(relocator.moves).toEqual([])
  })

  it('keeps the frontmatter change when the file can’t move', async () => {
    repository.put(p('manuscript/Part Two/First frost.md'), { type: 'note' })
    const moved = await moveChapter()(frost, { part: partTwo, index: 0 })
    expect(moved).toMatchObject({ ok: true, value: { path: frost } })
    expect(repository.get(frost)?.frontmatter['part']).toBe('[[Part Two]]')
  })

  it('places a chapter from the unordered tray', async () => {
    repository.put(p('manuscript/Stray.md'), { type: 'chapter', title: 'Stray' })
    await moveChapter()(p('manuscript/Stray.md'), { part: partOne, index: 99 })
    expect(repository.get(p('manuscript/Stray.md'))?.frontmatter).toMatchObject({
      part: '[[Part One]]',
      order: 5
    })
  })

  it('needs a part when the book has parts', async () => {
    expect(await moveChapter()(frost, { part: undefined, index: 0 })).toMatchObject({
      ok: false,
      error: { code: 'part-required' }
    })
  })
})

describe('MoveChapter to the unordered tray', () => {
  it('removes only the order', async () => {
    await moveChapter()(frost, null)
    expect(repository.get(frost)?.frontmatter).toEqual({
      type: 'chapter',
      title: 'First frost',
      part: '[[Part One]]'
    })
  })
})

describe('MovePart', () => {
  it('reorders the numbered parts', async () => {
    const moved = await createMovePart({ repository, settings })(partTwo, 0)
    expect(moved).toMatchObject({ ok: true, value: { changed: 2 } })
    expect([partTwo, partOne].map(order)).toEqual([1, 2])
  })

  it('brings an unnumbered part into the sequence', async () => {
    const extra = p('manuscript/Coda/Coda.md')
    repository.put(extra, { type: 'part', title: 'Coda' })
    await createMovePart({ repository, settings })(extra, 1)
    expect([partOne, extra, partTwo].map(order)).toEqual([1, 2, 3])
  })

  it('refuses in a read-only project', async () => {
    expect(
      await createMovePart({ repository, settings: { ...settings, readOnly: true } })(partTwo, 0)
    ).toMatchObject({ ok: false, error: { code: 'read-only' } })
  })
})

describe('PlanRename and RenameEntry', () => {
  const plan = (fileNames: ManuscriptSettings['fileNames']): ReturnType<typeof createPlanRename> =>
    createPlanRename({ repository, relocator, settings: { ...settings, fileNames } })

  it('plans nothing while the name matches the title', async () => {
    expect(await plan('ask')(ferry)).toEqual({ ok: true, value: null })
    expect(await createRenameEntry({ repository, relocator, settings })(ferry)).toMatchObject({
      ok: false,
      error: { code: 'name-matches', diagnostic: { reason: 'name-matches' } }
    })
  })

  it('plans a rename with the links it would update', async () => {
    retitle(partOne, 'The Orchard Years')
    expect(await plan('always')(partOne)).toEqual({
      ok: true,
      value: {
        newPath: 'manuscript/Part One/The Orchard Years.md',
        policy: 'always',
        linkCount: 4,
        fileCount: 4
      }
    })
    expect(await plan('never')(partOne)).toEqual({ ok: true, value: null })
  })

  it('never takes another file’s name', async () => {
    retitle(ferry, 'The Orchard')
    expect(await plan('ask')(ferry)).toMatchObject({
      value: { newPath: 'manuscript/Part One/The Orchard (chapter).md' }
    })
  })

  it('renames the file and updates links', async () => {
    retitle(partOne, 'The Orchard Years')
    const renamed = await createRenameEntry({ repository, relocator, settings })(partOne)
    expect(renamed).toMatchObject({
      ok: true,
      value: { path: 'manuscript/Part One/The Orchard Years.md', links: { linkCount: 4 } }
    })
    expect(repository.get(ferry)?.frontmatter['part']).toBe('[[The Orchard Years]]')
  })
})
