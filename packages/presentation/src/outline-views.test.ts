import type { OutlineItemView, OutlineView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { boardColumns, boardDrop, cardMoves, indentedLine, inlineSpans, newLineAfter, outdentedLine, outlineRows } from './outline-views'

const item = (text: string, children: OutlineItemView[] = [], options: Partial<OutlineItemView> = {}): OutlineItemView => ({
  text,
  checked: null,
  children,
  keptAsWritten: [],
  movable: true,
  ...options,
})

const outline: OutlineView = {
  file: 'outlines/main-story.md' as ProjectPath,
  title: 'Main story',
  preamble: [],
  canUndo: false,
  invalidDetails: false,
  sections: [
    {
      name: 'Beginning',
      intro: ['Before anyone speaks.'],
      items: [item('Ilka arrives', [item('With one suitcase', [item("Her mother's")])]), item('The frost')],
      notes: [{ kind: 'group', text: 'Act two', before: 1 }],
    },
    {
      name: 'Middle',
      intro: [],
      items: [item('Stuck', [], { movable: false }), item('The ledger')],
      notes: [{ kind: 'kept', text: '| a | b |', before: 2 }],
    },
    { name: 'Ending', intro: [], items: [], notes: [] },
  ],
}

describe('the board', () => {
  it('shows a column per section, with group labels and kept tiles where they sit among the cards', () => {
    const columns = boardColumns(outline)
    expect(columns.map((column) => column.name)).toEqual(['Beginning', 'Middle', 'Ending'])
    expect(columns[0]?.entries.map((entry) => (entry.kind === 'card' ? entry.item.text : `[${entry.kind}] ${entry.text}`))).toEqual([
      'Ilka arrives',
      '[group] Act two',
      'The frost',
    ])
    expect(columns[1]?.entries.map((entry) => entry.kind)).toEqual(['card', 'card', 'kept'])
    expect(columns[0]?.entries[0]).toMatchObject({ kind: 'card', path: { section: 0, path: [0] }, detailCount: 2 })
  })
})

describe('the outline view', () => {
  it('lists every item with its depth, and hides what is inside collapsed items', () => {
    expect(outlineRows(outline, new Set()).map((row) => [row.depth, row.item.text])).toEqual([
      [0, 'Ilka arrives'],
      [1, 'With one suitcase'],
      [2, "Her mother's"],
      [0, 'The frost'],
      [0, 'Stuck'],
      [0, 'The ledger'],
    ])
    const collapsed = outlineRows(outline, new Set(['0/0']))
    expect(collapsed.map((row) => row.item.text)).toEqual(['Ilka arrives', 'The frost', 'Stuck', 'The ledger'])
    expect(collapsed[0]).toMatchObject({ key: '0/0', hasChildren: true, collapsed: true })
  })
})

describe('typing new lines in the list', () => {
  const rows = outlineRows(outline, new Set())
  const to = (section: number, parentPath: number[], index: number) => ({ section, parentPath, index })

  it('shows a new line after everything inside the item above it, under its parent, or at the section start', () => {
    expect(newLineAfter(rows, to(0, [], 1))).toBe('0/0/0/0') // after "Ilka arrives" and all its details
    expect(newLineAfter(rows, to(0, [], 2))).toBe('0/1')
    expect(newLineAfter(rows, to(0, [0], 0))).toBe('0/0') // the first detail: right under its card
    expect(newLineAfter(rows, to(0, [], 0))).toBeNull()
    expect(newLineAfter(rows, to(2, [], 0))).toBeNull() // an empty section
    // A collapsed card hides its details, so the line follows the card itself.
    expect(newLineAfter(outlineRows(outline, new Set(['0/0'])), to(0, [], 1))).toBe('0/0')
  })

  it('Tab makes the line the last detail of the item above; not for the first line', () => {
    expect(indentedLine(outline, to(0, [], 1))).toEqual(to(0, [0], 1)) // "Ilka arrives" already has one detail
    expect(indentedLine(outline, to(0, [], 2))).toEqual(to(0, [1], 0))
    expect(indentedLine(outline, to(0, [0], 1))).toEqual(to(0, [0, 0], 1))
    expect(indentedLine(outline, to(0, [], 0))).toBeNull()
  })

  it('Shift+Tab moves the line out one level, right after its parent; not for a card', () => {
    expect(outdentedLine(to(0, [0], 1))).toEqual(to(0, [], 1))
    expect(outdentedLine(to(0, [0, 0], 0))).toEqual(to(0, [0], 1))
    expect(outdentedLine(to(0, [], 3))).toBeNull()
  })

  it('Tab then Shift+Tab puts the line back where it was', () => {
    const start = to(1, [], 2)
    const indented = indentedLine(outline, start)
    expect(indented && outdentedLine(indented)).toEqual(start)
  })
})

describe('moving a card with the keyboard', () => {
  const at = (section: number, ...path: number[]) => ({ section, path })

  it('moves up and down within its section, and on into the neighbouring section', () => {
    expect(cardMoves(outline, at(0, 1)).earlier).toEqual({ section: 0, parentPath: [], index: 0 })
    expect(cardMoves(outline, at(0, 1)).later).toEqual({ section: 1, parentPath: [], index: 0 })
    expect(cardMoves(outline, at(1, 1)).later).toEqual({ section: 2, parentPath: [], index: 0 })
    expect(cardMoves(outline, at(1, 0)).earlier).toBeNull() // a locked card doesn't move
  })

  it('moves to the previous or next section, keeping its place at the end', () => {
    expect(cardMoves(outline, at(0, 0)).previousSection).toBeNull()
    expect(cardMoves(outline, at(0, 0)).nextSection).toEqual({ section: 1, parentPath: [], index: 2 })
    expect(cardMoves(outline, at(1, 1)).previousSection).toEqual({ section: 0, parentPath: [], index: 2 })
  })

  it('moves a detail only among its siblings', () => {
    const outlineWithSiblings: OutlineView = {
      ...outline,
      sections: [{ name: 'Beginning', intro: [], notes: [], items: [item('Card', [item('one'), item('two')])] }],
    }
    expect(cardMoves(outlineWithSiblings, at(0, 0, 1)).earlier).toEqual({ section: 0, parentPath: [0], index: 0 })
    expect(cardMoves(outlineWithSiblings, at(0, 0, 1)).later).toBeNull()
    expect(cardMoves(outlineWithSiblings, at(0, 0, 1)).nextSection).toBeNull()
  })

  it('stops at the start and end of the outline', () => {
    expect(cardMoves(outline, at(0, 0)).earlier).toBeNull()
  })
})

describe('card text, shown formatted but never as HTML', () => {
  it('reads bold, italic, links and code', () => {
    expect(inlineSpans('Ilka *arrives* with **one** [suitcase](../notes/bag.md) and `code`')).toEqual([
      { kind: 'text', text: 'Ilka ' },
      { kind: 'em', text: 'arrives' },
      { kind: 'text', text: ' with ' },
      { kind: 'strong', text: 'one' },
      { kind: 'text', text: ' ' },
      { kind: 'link', text: 'suitcase', target: '../notes/bag.md' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: 'code' },
    ])
  })

  it('keeps markup it does not know, and HTML, as plain text', () => {
    expect(inlineSpans('<b>not bold</b> and \\*not italic\\*')).toEqual([{ kind: 'text', text: '<b>not bold</b> and *not italic*' }])
  })

  it('reads a link whose path has spaces, written in angle brackets', () => {
    expect(inlineSpans('השער נעול, ראו [שער המטע](<../manuscript/שער המטע.md>)')).toEqual([
      { kind: 'text', text: 'השער נעול, ראו ' },
      { kind: 'link', text: 'שער המטע', target: '<../manuscript/שער המטע.md>' },
    ])
  })

  it('handles Hebrew and wikilinks as text', () => {
    expect(inlineSpans('יעל *קראה* [[the-crossing]]')).toEqual([
      { kind: 'text', text: 'יעל ' },
      { kind: 'em', text: 'קראה' },
      { kind: 'text', text: ' [[the-crossing]]' },
    ])
  })
})

describe('dropping a dragged card on the board', () => {
  const card = (section: number, index: number) => ({ section, path: [index] })

  it('goes before the card it was dropped above, counting its own place out in the same column', () => {
    expect(boardDrop(card(0, 0), 0, 2)).toEqual({ section: 0, parentPath: [], index: 1 })
    expect(boardDrop(card(0, 2), 0, 0)).toEqual({ section: 0, parentPath: [], index: 0 })
  })

  it('goes into another column at the gap, or at its end', () => {
    expect(boardDrop(card(0, 0), 1, 1)).toEqual({ section: 1, parentPath: [], index: 1 })
    expect(boardDrop(card(0, 0), 1, 3)).toEqual({ section: 1, parentPath: [], index: 3 })
  })

  it('is no move just above or just below the card itself', () => {
    expect(boardDrop(card(0, 1), 0, 1)).toBeNull()
    expect(boardDrop(card(0, 1), 0, 2)).toBeNull()
  })

  it('lifts a detail out to a card of its own', () => {
    expect(boardDrop({ section: 0, path: [0, 1] }, 0, 1)).toEqual({ section: 0, parentPath: [], index: 1 })
  })
})
