import { ensureSyntaxTree } from '@codemirror/language'
import { Compartment, EditorSelection, type EditorState, type SelectionRange, type StateCommand } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import directionMarkers from '../../../tests/fixtures/chapters/direction-markers.md?raw'
import en from '../../../tests/fixtures/chapters/en.md?raw'
import formatting from '../../../tests/fixtures/chapters/formatting.md?raw'
import he from '../../../tests/fixtures/chapters/he.md?raw'
import mixed from '../../../tests/fixtures/chapters/mixed.md?raw'
import unsupported from '../../../tests/fixtures/chapters/unsupported.md?raw'
import outlineHe from '../../../tests/fixtures/outlines/basic-he.md?raw'
import outlineCrlf from '../../../tests/fixtures/outlines/crlf.md?raw'
import outlineDeep from '../../../tests/fixtures/outlines/deep-nesting.md?raw'
import outlineEmbedded from '../../../tests/fixtures/outlines/embedded-blocks.md?raw'
import outlineMixed from '../../../tests/fixtures/outlines/mixed-direction.md?raw'
import outlineTabs from '../../../tests/fixtures/outlines/indent-tabs.md?raw'
import outlineLists from '../../../tests/fixtures/outlines/ordered-and-task-lists.md?raw'
import outlineNiqqud from '../../../tests/fixtures/outlines/unicode-niqqud-emoji.md?raw'
import { deleteBackward, deleteForward, moveBy, renderedRules } from './caret'
import { chapterState } from './chapter-state'
import { formatCommands } from './format'
import { hiddenIn, restingPlace } from './hidden'
import type { EditorSettings } from './settings'

const english: EditorSettings = {
  projectDirection: 'ltr',
  directionMode: 'project',
  language: 'en',
  labels: { chapterText: 'Chapter text', sceneBreak: 'Scene break' },
}
const hebrew: EditorSettings = { ...english, projectDirection: 'rtl', language: 'he' }

function stateOf(text: string, settings = english, cursor?: number): EditorState {
  const state = chapterState(text, new Compartment(), settings, renderedRules({ nestingUnit: () => '  ' }))
  ensureSyntaxTree(state, state.doc.length, 5000)
  return cursor === undefined ? state : state.update({ selection: EditorSelection.cursor(cursor) }).state
}

/** What is hidden, as the text it hides, its kind, and what is drawn instead. */
function hidden(text: string, settings = english): string[] {
  const state = stateOf(text, settings)
  return hiddenIn(state, 0, state.doc.length).map((h) => `${state.sliceDoc(h.from, h.to)}|${h.kind}${h.shows ? `|${h.shows}` : ''}`)
}

function run(state: EditorState, command: StateCommand): EditorState {
  let next = state
  ensureSyntaxTree(state, state.doc.length, 5000)
  command({ state, dispatch: (tr) => (next = tr.state) })
  ensureSyntaxTree(next, next.doc.length, 5000)
  return next
}

/** Deletes `from`–`to` as the author would, by selecting and pressing Backspace. */
function deleteRange(state: EditorState, from: number, to: number, userEvent = 'delete.selection'): EditorState {
  const next = state.update({ changes: { from, to }, userEvent }).state
  ensureSyntaxTree(next, next.doc.length, 5000)
  return next
}

/** Deletes `snippet`, the first time it appears. */
function deleteText(state: EditorState, snippet: string): EditorState {
  const from = state.doc.toString().indexOf(snippet)
  if (from < 0) throw new Error(`"${snippet}" not found`)
  return deleteRange(state, from, from + snippet.length)
}

/**
 * One character at a time, the way CodeMirror moves through atomic ranges: a step into a hidden range
 * comes out at its far side. Stands in for `view.moveByChar`, which needs a screen; the visual cases,
 * with real bidi, are in the end-to-end tests.
 */
function logicalStep(state: EditorState, forward: boolean) {
  return (range: SelectionRange): SelectionRange => {
    let pos = Math.max(0, Math.min(state.doc.length, range.head + (forward ? 1 : -1)))
    for (const h of hiddenIn(state, 0, state.doc.length)) if (pos > h.from && pos < h.to) pos = forward ? h.to : h.from
    return EditorSelection.cursor(pos)
  }
}

/** Every place the right (or left) arrow stops, from the start (or the end). */
function stops(text: string, forward: boolean): number[] {
  const state = stateOf(text)
  let range = EditorSelection.cursor(restingPlace(state, forward ? 0 : state.doc.length))
  const seen = [range.head]
  for (let i = 0; i < 100; i++) {
    const next = moveBy(state, range, logicalStep(state, forward), false)
    if (next.head === range.head) break
    seen.push(next.head)
    range = next
  }
  return seen
}

describe('what is hidden (ADR 0010)', () => {
  it.each([
    ['a heading’s marks', '## The orchard', ['## |prefix']],
    ['bold and italics', 'Was **never** *there*', ['**|mark', '**|mark', '*|mark', '*|mark']],
    ['a link’s brackets and address', 'See [Bea](../characters/bea.md).', ['[|link-open', '](../characters/bea.md)|link-close']],
    ['a quote’s mark', '> Do not sell.', ['> |prefix']],
    ['a bullet and its indentation, drawn as a bullet', '- pears\n  - the north rows', ['- |prefix|•', '  - |prefix|•']],
    ['a number, drawn as written', '1. pears', ['1. |prefix|1.']],
    ['a line break’s backslash', 'Dear Ilka,\\\nDo not come.', ['\\|mark']],
    ['a scene break, drawn as ⁂', 'One.\n\n* * *\n\nTwo.', ['* * *|whole|⁂']],
    ['a wikilink without a label, drawn as its name', 'Ask [[bea]] first.', ['[[bea]]|whole|bea']],
    ['a wikilink’s target, before its label', 'Ask [[bea|Aunt Bea]] first.', ['[[bea||link-open', ']]|link-close']],
    ['direction brackets', 'נואל ענה: [Never]{dir=ltr} ושתק.', ['[|mark', ']{dir=ltr}|mark']],
    ['a Hebrew heading and bold', '## המטע **הישן**', ['## |prefix', '**|mark', '**|mark']],
  ])('%s', (_name, text, expected) => {
    expect(hidden(text)).toEqual(expected)
  })

  it.each([
    ['a hashtag', '#hashtag at the start'],
    ['arithmetic', '5 * 3 is fifteen'],
    ['a language name', 'Written in C# and Go'],
    ['an email address', 'Write to ilka@marrow.example'],
    ['a reference-style link, kept as written', 'See [the ledger][ledger].\n\n[ledger]: https://example.com'],
    ['an image, kept as written', '![The gate](gate.png)'],
    ['marks inside code', 'Type `**bold**` to bold'],
    ['a table, kept as written', '| a | b |\n| - | - |\n| **c** | d |'],
  ])('leaves %s alone', (_name, text) => {
    expect(hidden(text).filter((h) => !h.startsWith('[ledger]'))).toEqual([])
  })
})

describe('where the cursor rests', () => {
  const rests = (text: string, settings = english): number[] => {
    const state = stateOf(text, settings)
    return Array.from({ length: state.doc.length + 1 }, (_, pos) => restingPlace(state, pos))
  }

  it('before hidden marks, so typing takes the formatting before it', () => {
    // a**b**c: after "a" typing is plain; after "b" it is bold.
    expect(rests('a**b**c')).toEqual([0, 1, 1, 1, 4, 4, 4, 7])
  })

  it('outside a link at either end, so typing next to it never makes the link longer', () => {
    // x[Bea](b.md)y: before "B" is outside the link, after "a" too.
    expect(rests('x[Bea](b.md)y')).toEqual([0, 1, 1, 3, 4, 12, 12, 12, 12, 12, 12, 12, 12, 13])
  })

  it('inside the bold around a link, outside the link', () => {
    const text = '**[Bea](b.md)** came'
    expect(restingPlace(stateOf(text), text.indexOf('](b.md)'))).toBe(text.indexOf('** came'))
  })

  it('after a heading’s, bullet’s or quote’s marks, never before them', () => {
    expect(rests('## Two')).toEqual([3, 3, 3, 3, 4, 5, 6])
    expect(rests('  - b').slice(0, 5)).toEqual([4, 4, 4, 4, 4])
    expect(rests('> a').slice(0, 3)).toEqual([2, 2, 2])
  })

  it('the same way in Hebrew, by the order of the text', () => {
    expect(rests('א**ב**ג', hebrew)).toEqual([0, 1, 1, 1, 4, 4, 4, 7])
  })

  it('between the marks of bold just switched on, with nothing typed yet', () => {
    const state = run(stateOf('Frost came.', english, 6), formatCommands.bold)
    expect(state.sliceDoc()).toBe('Frost ****came.')
    expect(restingPlace(state, 6)).toBe(8)
    expect(state.selection.main.head).toBe(8)
  })
})

describe('arrow keys never get stuck', () => {
  it('one press moves past one character you can see', () => {
    expect(stops('a**b**c', true)).toEqual([0, 1, 4, 7])
    expect(stops('a**b**c', false)).toEqual([7, 4, 1, 0])
  })

  it('through a link', () => {
    expect(stops('x[Bea](b.md)y', true)).toEqual([0, 1, 3, 4, 12, 13])
    expect(stops('x[Bea](b.md)y', false)).toEqual([13, 12, 4, 3, 1, 0])
  })

  it('across lines, past a heading’s marks', () => {
    expect(stops('One\n## Two', true)).toEqual([0, 1, 2, 3, 7, 8, 9, 10])
    expect(stops('One\n## Two', false)).toEqual([10, 9, 8, 7, 3, 2, 1, 0])
  })

  it('in Hebrew with English bold', () => {
    expect(stops('אבג **Szeged** דה', true)).toEqual([0, 1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 15, 16, 17])
  })

  it('extending a selection keeps its anchor', () => {
    const state = stateOf('a**b**c')
    const range = moveBy(state, EditorSelection.cursor(1), logicalStep(state, true), true)
    expect([range.anchor, range.head]).toEqual([1, 4])
  })
})

describe('Backspace and Delete', () => {
  /** The cursor where typing would leave it: right after `at`, even past hidden marks (a click would rest it before them). */
  const backspace = (text: string, at: string | number, settings = english): string => {
    const cursor = typeof at === 'number' ? at : text.indexOf(at) + at.length
    const state = stateOf(text, settings)
    const typed = state.update({
      changes: { from: 0, to: state.doc.length, insert: text },
      selection: EditorSelection.cursor(cursor),
    }).state
    return run(typed, deleteBackward).sliceDoc()
  }

  it('at the start of a heading, makes it body text', () => {
    expect(backspace('## The orchard', 3)).toBe('The orchard')
  })

  it('at the start of a detail, moves it out a level, with its own details', () => {
    expect(backspace('- a\n  - b\n    - c', '  - ')).toBe('- a\n- b\n  - c')
  })

  it('at the start of a top-level bullet or a quote, ends it', () => {
    expect(backspace('- pears', 2)).toBe('pears')
    expect(backspace('> Do not sell.', 2)).toBe('Do not sell.')
  })

  it('past hidden marks, erases the letter before them', () => {
    expect(backspace('Was **never** there', 'never**')).toBe('Was **neve** there')
    expect(backspace('ראה את [בּיה](bea.md) שם', '](bea.md)')).toBe('ראה את [בּי](bea.md) שם')
  })

  it('erasing the last letter of bold or a link removes its marks too', () => {
    expect(backspace('a**b**c', 'b**')).toBe('ac')
    let state = stateOf('Ask [Bea](b.md) now')
    for (const letter of ['a', 'e', 'B']) {
      const at = state.doc.toString().indexOf(`${letter}](`)
      state = deleteRange(state, at, at + 1, 'delete.backward')
    }
    expect(state.sliceDoc()).toBe('Ask  now')
  })

  it('Delete before hidden marks erases the letter after them', () => {
    const text = 'Was **never** there'
    expect(run(stateOf(text, english, text.indexOf('never') - 2), deleteForward).sliceDoc()).toBe('Was **ever** there')
  })

  it('leaves Backspace to the editor where nothing is hidden', () => {
    expect(run(stateOf('plain words', english, 5), deleteBackward).sliceDoc()).toBe('plain words')
  })
})

describe('edits never leave marks showing', () => {
  it('a deletion through bold keeps the bold closed', () => {
    expect(deleteText(stateOf('a **bold** plain'), 'ld** pla').sliceDoc()).toBe('a **bo**in')
  })

  it('a deletion through a link keeps the rest a link', () => {
    expect(deleteText(stateOf('see [Bea Halmi](b.md) now'), 'Halmi](b.md) n').sliceDoc()).toBe('see [Bea ](b.md)ow')
  })

  it('a deletion of the whole of something takes it all', () => {
    expect(deleteText(stateOf('a **bold** plain'), '**bold** ').sliceDoc()).toBe('a plain')
    expect(deleteText(stateOf('see [Bea](b.md) now'), '[Bea](b.md) ').sliceDoc()).toBe('see now')
  })

  it('joining a line to a heading or bullet drops their marks', () => {
    expect(deleteRange(stateOf('One.\n## Two'), 4, 5, 'delete.forward').sliceDoc()).toBe('One.Two')
    expect(deleteRange(stateOf('One.\n- two'), 4, 5, 'delete.forward').sliceDoc()).toBe('One.two')
  })

  it('bold switched on and left empty leaves nothing behind', () => {
    const on = run(stateOf('Frost came.', english, 6), formatCommands.bold)
    expect(on.update({ selection: EditorSelection.cursor(0) }).state.sliceDoc()).toBe('Frost came.')
    const typed = on.update({
      changes: { from: 8, insert: 'early ' },
      selection: EditorSelection.cursor(14),
      userEvent: 'input.type',
    }).state
    expect(typed.update({ selection: EditorSelection.cursor(0) }).state.sliceDoc()).toBe('Frost **early **came.')
  })

  it('the app’s own formatting can still remove marks', () => {
    const bold = run(stateOf('Plain words here.').update({ selection: EditorSelection.range(0, 11) }).state, formatCommands.bold)
    expect(run(bold, formatCommands.bold).sliceDoc()).toBe('Plain words here.')
  })

  it('keeps the file’s line endings', () => {
    expect(deleteRange(stateOf('One.\r\n## Two\r\n'), 4, 5, 'delete.forward').sliceDoc()).toBe('One.Two\r\n')
  })
})

describe('fidelity in rendered mode (ADR 0010)', () => {
  const bodyOf = (file: string): string => file.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')

  it.each([
    ['chapters/direction-markers.md', directionMarkers],
    ['chapters/en.md', en],
    ['chapters/formatting.md', formatting],
    ['chapters/he.md', he],
    ['chapters/mixed.md', mixed],
    ['chapters/unsupported.md', unsupported],
    ['outlines/basic-he.md', outlineHe],
    ['outlines/crlf.md', outlineCrlf],
    ['outlines/deep-nesting.md', outlineDeep],
    ['outlines/embedded-blocks.md', outlineEmbedded],
    ['outlines/mixed-direction.md', outlineMixed],
    ['outlines/indent-tabs.md', outlineTabs],
    ['outlines/ordered-and-task-lists.md', outlineLists],
    ['outlines/unicode-niqqud-emoji.md', outlineNiqqud],
  ])('%s: the cursor anywhere, then saved, gives the same text', (_name, file) => {
    const body = bodyOf(file)
    let state = stateOf(body)
    for (let pos = 0; pos <= state.doc.length; pos++) state = state.update({ selection: EditorSelection.cursor(pos) }).state
    expect(state.sliceDoc()).toBe(body)
  })
})
