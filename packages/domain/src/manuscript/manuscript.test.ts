import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import {
  addChapter,
  addPart,
  chapterNumbers,
  findOutdatedLinkText,
  moveChapter,
  removeChapter,
  renameChapterLink,
  renamePart,
  replaceChapterFile,
  type Contents,
} from './manuscript'

const p = (path: string) => path as ProjectPath
const ch = (name: string, linkText = name) => ({ kind: 'chapter' as const, file: p(`manuscript/${name}.md`), linkText })

/** Prologue, Part One (Crossing, Gate), Part Two (Frost), Epilogue: the sample project. */
const book: Contents = {
  entries: [
    ch('prologue', 'Prologue'),
    { kind: 'part', name: 'Part One: Arrival', chapters: [ch('the-crossing', 'The Crossing'), ch('the-orchard-gate', 'The Orchard Gate')] },
    { kind: 'part', name: 'Part Two: Salt', chapters: [ch('frost', 'Frost')] },
    ch('epilogue', 'Epilogue'),
  ],
}
const files = (contents: Contents): string[] =>
  contents.entries.flatMap((e) => (e.kind === 'chapter' ? [e.file] : [`[${e.name}]`, ...e.chapters.map((c) => c.file)]))
const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) throw new Error(`unexpected failure: ${JSON.stringify(result.error)}`)
  return result.value
}

describe('adding a chapter', () => {
  it('inserts at the top level or inside a part', () => {
    const top = unwrap(addChapter(book, ch('interlude', 'Interlude'), { part: null, index: 2 }))
    expect(top.entries[2]).toEqual({ kind: 'chapter', file: 'manuscript/interlude.md', linkText: 'Interlude' })
    const inPart = unwrap(addChapter(book, ch('thaw', 'Thaw'), { part: 2, index: 1 }))
    expect(files(inPart)).toContain('manuscript/thaw.md')
    expect(inPart.entries[2]).toMatchObject({ kind: 'part', chapters: [{ linkText: 'Frost' }, { linkText: 'Thaw' }] })
  })

  it('refuses a file that is already in the book, even with different case or normalization', () => {
    expect(addChapter(book, ch('Frost', 'Frost again'), { part: null, index: 0 })).toEqual({ ok: false, error: 'already-in-book' })
  })

  it('refuses positions that do not exist', () => {
    expect(addChapter(book, ch('x'), { part: null, index: 9 })).toEqual({ ok: false, error: 'no-such-position' })
    expect(addChapter(book, ch('x'), { part: 0, index: 0 })).toEqual({ ok: false, error: 'not-a-part' })
  })
})

describe('moving a chapter', () => {
  it('reorders within a part without touching anything else', () => {
    const moved = unwrap(moveChapter(book, p('manuscript/the-orchard-gate.md'), { part: 1, index: 0 }))
    expect(moved.entries[1]).toMatchObject({ chapters: [{ linkText: 'The Orchard Gate' }, { linkText: 'The Crossing' }] })
    expect(moved.entries.length).toBe(4)
  })

  it('moves out of a part to the top level, and into another part', () => {
    const out = unwrap(moveChapter(book, p('manuscript/frost.md'), { part: null, index: 4 }))
    expect(files(out).at(-1)).toBe('manuscript/frost.md')
    expect(out.entries[2]).toMatchObject({ kind: 'part', chapters: [] }) // an empty part stays: the author may fill it again
    const across = unwrap(moveChapter(book, p('manuscript/prologue.md'), { part: 2, index: 0 }))
    expect(across.entries[1]).toMatchObject({ name: 'Part Two: Salt', chapters: [{ linkText: 'Prologue' }, { linkText: 'Frost' }] })
  })

  it('treats the index as a position among the other entries (after removal)', () => {
    const last = unwrap(moveChapter(book, p('manuscript/prologue.md'), { part: null, index: 3 }))
    expect(files(last).at(-1)).toBe('manuscript/prologue.md')
  })

  it('refuses a chapter that is not in the book', () => {
    expect(moveChapter(book, p('manuscript/nope.md'), { part: null, index: 0 })).toEqual({ ok: false, error: 'not-in-book' })
  })
})

describe('removing, renaming, parts', () => {
  it('removes a chapter from the book (its file is untouched; that is storage)', () => {
    expect(files(unwrap(removeChapter(book, p('manuscript/frost.md'))))).not.toContain('manuscript/frost.md')
  })

  it('renames a chapter link and a part, refusing empty names', () => {
    expect(unwrap(renameChapterLink(book, p('manuscript/frost.md'), 'Hard Frost')).entries[2]).toMatchObject({ chapters: [{ linkText: 'Hard Frost' }] })
    expect(renameChapterLink(book, p('manuscript/frost.md'), '  ')).toEqual({ ok: false, error: 'empty-name' })
    expect(unwrap(renamePart(book, 1, 'Arrival')).entries[1]).toMatchObject({ name: 'Arrival' })
    expect(renamePart(book, 0, 'Not a part')).toEqual({ ok: false, error: 'not-a-part' })
  })

  it('adds a part at a position', () => {
    const added = unwrap(addPart(book, 'Part Three: Sale', 3))
    expect(added.entries[3]).toEqual({ kind: 'part', name: 'Part Three: Sale', chapters: [] })
    expect(addPart(book, '', 0)).toEqual({ ok: false, error: 'empty-name' })
  })

  it('points a chapter at its renamed file', () => {
    const renamed = unwrap(replaceChapterFile(book, p('manuscript/frost.md'), p('manuscript/02-frost.md')))
    expect(files(renamed)).toContain('manuscript/02-frost.md')
    expect(replaceChapterFile(book, p('manuscript/frost.md'), p('manuscript/Epilogue.md'))).toEqual({ ok: false, error: 'already-in-book' })
  })
})

describe('chapter numbers (shown by the app, never written into files)', () => {
  it('continuous: every chapter in reading order', () => {
    expect([...chapterNumbers(book, 'continuous').values()]).toEqual([1, 2, 3, 4, 5])
  })

  it('per-part: restart in each part; chapters outside parts (prologue, epilogue) have no number', () => {
    const numbers = chapterNumbers(book, 'per-part')
    expect(numbers.get(p('manuscript/the-orchard-gate.md'))).toBe(2)
    expect(numbers.get(p('manuscript/frost.md'))).toBe(1)
    expect(numbers.get(p('manuscript/prologue.md'))).toBeNull()
  })

  it('none: no numbers at all', () => {
    expect([...chapterNumbers(book, 'none').values()].every((n) => n === null)).toBe(true)
  })
})

describe('outdated link text', () => {
  it('lists chapters whose contents link no longer matches their title', () => {
    const titles = new Map([
      [p('manuscript/frost.md'), 'Hard Frost'],
      [p('manuscript/prologue.md'), 'Prologue'],
    ])
    expect(findOutdatedLinkText(book, titles)).toEqual([{ file: 'manuscript/frost.md', linkText: 'Frost', title: 'Hard Frost' }])
  })
})
