import type { TimelineLineUpView, TimelineSectionView, TimelineThreadView, TimelineView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { chapterChips, timelineGrid, type TimelineGrid } from './timeline'

const p = (path: string) => path as ProjectPath
const MAIN = p('outlines/main-story.md')
const BEA = p('outlines/beas-path.md')
const HIST = p('outlines/history-of-marrow.md')

const to = (outline: ProjectPath, section: number): TimelineLineUpView => ({ kind: 'section', outline, section, text: '' })
const section = (name: string | null, lineUp: TimelineLineUpView | null = null): TimelineSectionView => ({
  name,
  anchor: name,
  items: [{ text: `${name ?? 'loose'} card`, checked: null, children: [], keptAsWritten: [], movable: true }],
  lineUp,
})
const thread = (file: ProjectPath, ...sections: TimelineSectionView[]): TimelineThreadView => ({ file, title: file, sections })
const view = (...threads: TimelineThreadView[]): TimelineView => ({ main: threads[0]?.file ?? null, threads })

const main = thread(MAIN, section('Prologue'), section('The crossing'), section('The first frost'), section('The sale'))

/** Each row as `column title or ·: section name (state)`, in column order, for reading at a glance. */
function picture(grid: TimelineGrid): string[] {
  const titles = grid.columns.map((column) => column.title ?? '·')
  return grid.rows
    .map(
      (row) =>
        `${row.file.slice(9, 12)} ` +
        row.cells.map((cell) => `${cell.column}:${cell.name ?? 'Before'}${cell.state === 'main' ? '' : ` (${cell.state})`}`).join(', '),
    )
    .concat([titles.join(' | ')])
}

describe('the timeline grid (ADR 0012)', () => {
  it('names the columns with the main outline’s sections, in its order', () => {
    const grid = timelineGrid(view(main))
    expect(grid.columns.map((column) => [column.title, column.main])).toEqual([
      ['Prologue', 0],
      ['The crossing', 1],
      ['The first frost', 2],
      ['The sale', 3],
    ])
    expect(grid.rows.map((row) => row.isMain)).toEqual([true])
  })

  it('lays out the mockup: lined-up sections share a column, the rest sit in untitled gaps, a chain lines up too', () => {
    const bea = thread(
      BEA,
      section('Staying', to(MAIN, 0)),
      section('Landing', to(MAIN, 1)),
      section('Ledger'),
      section('Secret', to(MAIN, 3)),
    )
    const hist = thread(HIST, section('Salt years'), section('Flood'), section('Everyone leaves', to(BEA, 0)))
    expect(picture(timelineGrid(view(main, bea, hist)))).toEqual([
      'mai 2:Prologue, 3:The crossing, 5:The first frost, 6:The sale',
      'bea 2:Staying (lined-up), 3:Landing (lined-up), 4:Ledger (not-lined-up), 6:Secret (lined-up)',
      'his 0:Salt years (not-lined-up), 1:Flood (not-lined-up), 2:Everyone leaves (lined-up)',
      '· | · | Prologue | The crossing | · | The first frost | The sale',
    ])
  })

  it('lets sections of two storylines in the same gap share one column', () => {
    const bea = thread(BEA, section('Landing', to(MAIN, 1)), section('Ledger'), section('Secret', to(MAIN, 3)))
    const hist = thread(HIST, section('Harbour', to(MAIN, 1)), section('Storm'))
    const grid = timelineGrid(view(main, bea, hist))
    expect(grid.columns.map((column) => column.title ?? '·')).toEqual(['Prologue', 'The crossing', '·', 'The first frost', 'The sale'])
    expect(grid.rows[1]?.cells[1]?.column).toBe(2)
    expect(grid.rows[2]?.cells[1]?.column).toBe(2)
  })

  it('lines up storylines with each other where the main outline has no section, in an untitled column', () => {
    const bea = thread(BEA, section('Alone'), section('With Noel'))
    const hist = thread(HIST, section('Noel arrives', to(BEA, 1)))
    const grid = timelineGrid(view(main, bea, hist))
    const column = grid.rows[1]?.cells[1]?.column
    expect(grid.rows[2]?.cells[0]).toMatchObject({ column, state: 'lined-up' })
    expect(grid.rows[1]?.cells[1]?.state).toBe('lined-up')
    expect(column === undefined ? null : grid.columns[column]?.title).toBeNull()
  })

  it('shows a line-up whose section is gone as “can’t line up”, in its gap', () => {
    const missing: TimelineLineUpView = { kind: 'missing', outline: MAIN, anchor: 'the-flood', text: 'The flood' }
    const bea = thread(BEA, section('Landing', to(MAIN, 1)), section('Lost', missing))
    expect(picture(timelineGrid(view(main, bea)))[1]).toBe('bea 1:Landing (lined-up), 2:Lost (missing)')
  })

  it('shows a line-up against the storyline’s own order as “can’t line up”, keeping the first', () => {
    const bea = thread(BEA, section('Late', to(MAIN, 3)), section('Early', to(MAIN, 0)))
    const grid = timelineGrid(view(main, bea))
    expect(grid.rows[1]?.cells.map((cell) => [cell.name, cell.state])).toEqual([
      ['Late', 'lined-up'],
      ['Early', 'contradicts'],
    ])
    expect(grid.rows[1]?.cells[1]?.column).toBeGreaterThan(grid.rows[1]?.cells[0]?.column ?? 0)
  })

  it('refuses two sections of one storyline at the same moment, and a cycle through a chain', () => {
    const twice = thread(BEA, section('One', to(MAIN, 1)), section('Two', to(MAIN, 1)))
    expect(timelineGrid(view(main, twice)).rows[1]?.cells.map((cell) => cell.state)).toEqual(['lined-up', 'contradicts'])
    const a = thread(BEA, section('A1', to(HIST, 1)), section('A2'))
    const b = thread(HIST, section('B1', to(BEA, 1)), section('B2'))
    expect(
      timelineGrid(view(main, a, b))
        .rows.slice(1)
        .map((row) => row.cells.map((cell) => cell.state)),
    ).toEqual([
      ['lined-up', 'not-lined-up'],
      ['contradicts', 'lined-up'],
    ])
  })

  it('accepts a line-up a chain already implies', () => {
    const bea = thread(BEA, section('Staying', to(MAIN, 0)))
    const hist = thread(HIST, section('Everyone leaves', to(BEA, 0)), section('Later'))
    const both = thread(p('outlines/noel.md'), section('Noel waits', to(HIST, 0)))
    const again = { ...both, sections: [section('Noel waits', to(MAIN, 0))] }
    for (const extra of [both, again])
      expect(timelineGrid(view(main, bea, hist, extra)).rows[3]?.cells[0]).toMatchObject({ column: 0, state: 'lined-up' })
    // Both ends say so: the main outline's prologue and Bea's section point at each other.
    const mutual = thread(MAIN, section('Prologue', to(BEA, 0)), section('The crossing'))
    expect(timelineGrid(view(mutual, bea)).rows.map((row) => row.cells[0]?.state)).toEqual(['main', 'lined-up'])
  })

  it('lines up the main outline’s own sections with another storyline', () => {
    const lined = thread(MAIN, section('Prologue'), section('The crossing', to(BEA, 1)))
    const bea = thread(BEA, section('Before the crossing'), section('On the ferry'))
    expect(picture(timelineGrid(view(lined, bea)))).toEqual([
      'mai 1:Prologue, 2:The crossing',
      'bea 0:Before the crossing (not-lined-up), 2:On the ferry (lined-up)',
      '· | Prologue | The crossing',
    ])
  })

  it('puts the main outline first whatever the order it comes in, and keeps cards before the first section', () => {
    const bea = thread(BEA, section(null), section('Landing', to(MAIN, 1)))
    const grid = timelineGrid({ main: MAIN, threads: [bea, main] })
    expect(grid.rows.map((row) => row.file)).toEqual([MAIN, BEA])
    expect(grid.rows[1]?.cells[0]).toMatchObject({ name: null, state: 'not-lined-up', column: 0 })
  })

  it('hides a storyline’s row and its empty gaps, while chains through it still line up', () => {
    const bea = thread(BEA, section('Staying', to(MAIN, 0)), section('Ledger'))
    const hist = thread(HIST, section('Everyone leaves', to(BEA, 0)))
    const grid = timelineGrid(view(main, bea, hist), new Set([BEA]))
    expect(grid.rows.map((row) => row.file)).toEqual([MAIN, HIST])
    expect(grid.columns.map((column) => column.title)).toEqual(['Prologue', 'The crossing', 'The first frost', 'The sale'])
    expect(grid.rows[1]?.cells[0]).toMatchObject({ column: 0, state: 'lined-up' })
  })

  it('is empty for a book without outlines, and gives each cell its cards', () => {
    expect(timelineGrid({ main: null, threads: [] })).toEqual({ columns: [], rows: [] })
    expect(timelineGrid(view(main)).rows[0]?.cells[0]?.items.map((item) => item.text)).toEqual(['Prologue card'])
  })
})

describe('chapter chips', () => {
  const chapters = [
    { file: p('manuscript/prologue.md'), linkText: 'Prologue', number: null },
    { file: p('manuscript/the crossing.md'), linkText: 'The Crossing', number: 1 },
    { file: p('manuscript/frost.md'), linkText: 'Frost', number: 2 },
  ]
  it('names the chapters a card links to, in reading order, whatever order the links are in', () => {
    const text = 'Bea waits, see [Frost](../manuscript/frost.md) and [the crossing](<../manuscript/the crossing.md#night>)'
    expect(chapterChips(text, chapters).map((chapter) => chapter.linkText)).toEqual(['The Crossing', 'Frost'])
  })

  it('gives no chip for pages, web links or chapters not in the book', () => {
    const text = '[Bea](../characters/bea.md), [site](https://example.com/manuscript/frost.md), [old](../manuscript/cut.md)'
    expect(chapterChips(text, chapters)).toEqual([])
  })
})
