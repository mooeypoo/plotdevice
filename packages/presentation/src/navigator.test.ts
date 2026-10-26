import type { ProjectView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { moveDown, moveTargets, moveUp, placementAfter, placementForDrop, slotAt } from './navigator'

const p = (path: string) => path as ProjectPath
const ch = (name: string) => ({ file: p(`manuscript/${name}.md`), linkText: name, number: null })

/** Prologue; Part One (frost, salt); Part Two (crossing); epilogue. */
const contents: ProjectView['contents'] = [
  { kind: 'chapter', ...ch('prologue') },
  { kind: 'part', name: 'Part One', chapters: [ch('frost'), ch('salt')] },
  { kind: 'part', name: 'Part Two', chapters: [ch('crossing')] },
  { kind: 'chapter', ...ch('epilogue') },
]

describe('moving a chapter up and down follows reading order', () => {
  it('moves within a part', () => {
    expect(moveUp(contents, p('manuscript/salt.md'))).toEqual({ part: 1, index: 0 })
    expect(moveDown(contents, p('manuscript/frost.md'))).toEqual({ part: 1, index: 1 })
  })

  it('steps out of a part before its first chapter or after its last', () => {
    expect(moveUp(contents, p('manuscript/frost.md'))).toEqual({ part: null, index: 1 })
    expect(moveDown(contents, p('manuscript/crossing.md'))).toEqual({ part: null, index: 3 })
  })

  it('steps into the neighbouring part', () => {
    expect(moveDown(contents, p('manuscript/prologue.md'))).toEqual({ part: 1, index: 0 })
    expect(moveUp(contents, p('manuscript/epilogue.md'))).toEqual({ part: 2, index: 1 })
  })

  it('moves between parts through the space between them', () => {
    expect(moveDown(contents, p('manuscript/salt.md'))).toEqual({ part: null, index: 2 })
  })

  it('stops at the start and end of the book', () => {
    expect(moveUp(contents, p('manuscript/prologue.md'))).toBeNull()
    expect(moveDown(contents, p('manuscript/epilogue.md'))).toBeNull()
  })

  it('moves among top-level chapters in a book without parts', () => {
    const flat: ProjectView['contents'] = [
      { kind: 'chapter', ...ch('a') },
      { kind: 'chapter', ...ch('b') },
      { kind: 'chapter', ...ch('c') },
    ]
    expect(moveUp(flat, p('manuscript/b.md'))).toEqual({ part: null, index: 0 })
    expect(moveDown(flat, p('manuscript/b.md'))).toEqual({ part: null, index: 2 })
  })

  it('knows nothing of chapters not in the book', () => {
    expect(moveUp(contents, p('manuscript/draft.md'))).toBeNull()
  })
})

describe('"Move to…" choices', () => {
  it('offers the start and end of the book and the end of each other part', () => {
    expect(moveTargets(contents, p('manuscript/frost.md'))).toEqual([
      { kind: 'start', placement: { part: null, index: 0 } },
      { kind: 'part', name: 'Part Two', placement: { part: 2, index: 1 } },
      { kind: 'end', placement: { part: null, index: 4 } },
    ])
  })

  it('leaves out where the chapter already is', () => {
    expect(moveTargets(contents, p('manuscript/prologue.md')).map((target) => target.kind)).toEqual(['part', 'part', 'end'])
    expect(moveTargets(contents, p('manuscript/epilogue.md')).map((target) => target.kind)).toEqual(['start', 'part', 'part'])
  })
})

describe('where a new chapter goes', () => {
  it('right after the open chapter, in its part', () => {
    expect(placementAfter(contents, p('manuscript/frost.md'))).toEqual({ part: 1, index: 1 })
    expect(placementAfter(contents, p('manuscript/prologue.md'))).toEqual({ part: null, index: 1 })
  })

  it('at the end of the book when no chapter in the book is open', () => {
    expect(placementAfter(contents, null)).toEqual({ part: null, index: 4 })
    expect(placementAfter(contents, p('manuscript/draft.md'))).toEqual({ part: null, index: 4 })
  })
})

describe('dropping a dragged chapter', () => {
  const drop = (file: string, row: Parameters<typeof slotAt>[1], half: 'before' | 'after') => {
    const slot = slotAt(contents, row, half)
    return slot && placementForDrop(contents, p(`manuscript/${file}.md`), slot)
  }
  const chapter = (name: string) => ({ kind: 'chapter' as const, file: p(`manuscript/${name}.md`) })

  it('goes before the top half of a row and after the bottom half', () => {
    expect(drop('epilogue', chapter('frost'), 'before')).toEqual({ part: 1, index: 0 })
    expect(drop('epilogue', chapter('frost'), 'after')).toEqual({ part: 1, index: 1 })
  })

  it('counts the chapter’s own place out when it moves within its list', () => {
    expect(drop('frost', chapter('salt'), 'after')).toEqual({ part: 1, index: 1 })
    expect(drop('prologue', chapter('epilogue'), 'after')).toEqual({ part: null, index: 3 })
  })

  it('stays inside a part below its last chapter, and outside above the next entry', () => {
    expect(drop('prologue', chapter('crossing'), 'after')).toEqual({ part: 2, index: 1 })
    expect(drop('prologue', chapter('epilogue'), 'before')).toEqual({ part: null, index: 2 })
  })

  it('a part’s name: above it is outside the part, below it is the part’s start', () => {
    expect(drop('epilogue', { kind: 'part', part: 2 }, 'before')).toEqual({ part: null, index: 2 })
    expect(drop('epilogue', { kind: 'part', part: 2 }, 'after')).toEqual({ part: 2, index: 0 })
  })

  it('is no move when dropped right where it is', () => {
    expect(drop('frost', chapter('frost'), 'before')).toBeNull()
    expect(drop('frost', chapter('salt'), 'before')).toBeNull()
  })

  it('places a chapter not in the book yet straight into the gap', () => {
    expect(drop('a-scene-for-later', chapter('salt'), 'before')).toEqual({ part: 1, index: 1 })
  })
})
