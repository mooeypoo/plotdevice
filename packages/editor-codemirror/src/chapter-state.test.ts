import { ensureSyntaxTree } from '@codemirror/language'
import { Compartment, EditorSelection, type EditorState, type StateCommand } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import directionMarkers from '../../../tests/fixtures/chapters/direction-markers.md?raw'
import en from '../../../tests/fixtures/chapters/en.md?raw'
import formatting from '../../../tests/fixtures/chapters/formatting.md?raw'
import he from '../../../tests/fixtures/chapters/he.md?raw'
import mixed from '../../../tests/fixtures/chapters/mixed.md?raw'
import unsupported from '../../../tests/fixtures/chapters/unsupported.md?raw'
import { chapterState } from './chapter-state'
import { formatCommands, insertLink, type FormatCommand } from './format'
import { lineBreak, newParagraph } from './keys'
import { directionLayout, setParagraphDirection, setPhraseDirection } from './paragraph-direction'
import { pasteText } from './paste'
import type { EditorSettings } from './settings'

const english: EditorSettings = {
  projectDirection: 'ltr',
  directionMode: 'project',
  language: 'en',
  labels: { chapterText: 'Chapter text', sceneBreak: 'Scene break' },
}
const hebrew: EditorSettings = { ...english, projectDirection: 'rtl', language: 'he' }

const bodyOf = (file: string): string => file.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
const stateOf = (text: string, settings = english): EditorState => chapterState(text, new Compartment(), settings)

function run(state: EditorState, command: StateCommand): EditorState {
  let next = state
  ensureSyntaxTree(state, state.doc.length, 5000)
  command({ state, dispatch: (tr) => (next = tr.state) })
  return next
}

/** The state with `snippet` selected, or the caret placed after it (`caret: 'after'`) or before it. */
function at(state: EditorState, snippet: string, caret?: 'before' | 'after'): EditorState {
  // Searched in `\n`-joined text, whose offsets are CodeMirror positions (a line break counts as one).
  const from = state.doc.toString().indexOf(snippet)
  if (from < 0) throw new Error(`"${snippet}" not found`)
  const to = from + snippet.length
  const selection =
    caret === 'after' ? EditorSelection.cursor(to) : caret === 'before' ? EditorSelection.cursor(from) : EditorSelection.range(from, to)
  return state.update({ selection }).state
}

function typeAt(state: EditorState, pos: number, text: string): EditorState {
  return state.update({ changes: { from: pos, insert: text }, userEvent: 'input.type' }).state
}

describe('fidelity (ADR 0003)', () => {
  it.each([
    ['en', en],
    ['he', he],
    ['mixed', mixed],
    ['formatting', formatting],
    ['unsupported', unsupported],
    ['direction-markers', directionMarkers],
  ])('opening and saving %s without edits gives the same text', (_name, file) => {
    const body = bodyOf(file)
    expect(stateOf(body).sliceDoc()).toBe(body)
  })

  it.each([
    ['Windows line endings', 'One.\r\n\r\nTwo.\r\n'],
    ['mixed line endings', 'One.\r\nTwo.\nThree.\r\n'],
    ['no final newline', 'One.\n\nTwo.'],
    ['trailing spaces and tabs', 'One.  \n\tTwo.\t\n'],
  ])('keeps %s byte for byte', (_name, body) => {
    expect(stateOf(body).sliceDoc()).toBe(body)
  })

  it.each([
    ['en', en, 'accusation.'],
    ['he', he, 'הגבעה'],
    ['mixed', mixed, 'The letter from Szeged'],
    ['unsupported', unsupported, 'The last ordinary paragraph'],
  ])('typing in %s changes only that paragraph', (_name, file, snippet) => {
    const body = bodyOf(file)
    const state = stateOf(body)
    const line = state.doc.lineAt(body.indexOf(snippet))
    const edited = typeAt(state, line.to, ' (edited)').sliceDoc()
    const before = body.split('\n')
    const after = edited.split('\n')
    expect(after).toHaveLength(before.length)
    expect(after.filter((text, i) => text !== before[i])).toEqual([`${line.text} (edited)`])
  })
})

describe('Enter and Shift+Enter', () => {
  it('Enter starts a new paragraph', () => {
    expect(run(at(stateOf('Frost came early.\n'), 'Frost came', 'after'), newParagraph).sliceDoc()).toBe('Frost came\n\n early.\n')
  })

  it('Enter on an empty line adds just one line', () => {
    expect(run(at(stateOf('One.\n\nTwo.\n'), 'One.\n', 'after'), newParagraph).sliceDoc()).toBe('One.\n\n\nTwo.\n')
  })

  it('Enter continues a list', () => {
    expect(run(at(stateOf('- pears\n'), 'pears', 'after'), newParagraph).sliceDoc()).toBe('- pears\n- \n')
  })

  it('Shift+Enter breaks the line inside the paragraph', () => {
    expect(run(at(stateOf('Frost came early.\n'), 'Frost came', 'after'), lineBreak).sliceDoc()).toBe('Frost came\\\n early.\n')
  })

  it('both keep Windows line endings', () => {
    const state = at(stateOf('Frost came early.\r\n'), 'Frost came', 'after')
    expect(run(state, newParagraph).sliceDoc()).toBe('Frost came\r\n\r\n early.\r\n')
    expect(run(state, lineBreak).sliceDoc()).toBe('Frost came\\\r\n early.\r\n')
  })
})

describe('formatting writes plain Markdown', () => {
  const expected: Record<FormatCommand, string> = {
    bold: '**Plain words** here.\n',
    italic: '*Plain words* here.\n',
    heading: '## Plain words here.\n',
    quote: '> Plain words here.\n',
    bulletList: '- Plain words here.\n',
    orderedList: '1. Plain words here.\n',
    sceneBreak: 'Plain words here.\n\n* * *\n\n\n',
  }

  it.each(Object.entries(expected))('%s', (command, markdown) => {
    expect(run(at(stateOf('Plain words here.\n'), 'Plain words'), formatCommands[command as FormatCommand]).sliceDoc()).toBe(markdown)
  })

  it('applying bold again removes it', () => {
    const bold = run(at(stateOf('Plain words here.\n'), 'Plain words'), formatCommands.bold)
    expect(run(bold, formatCommands.bold).sliceDoc()).toBe('Plain words here.\n')
  })

  it('applying a heading again removes it', () => {
    const heading = run(at(stateOf('Plain words here.\n'), 'Plain'), formatCommands.heading)
    expect(run(heading, formatCommands.heading).sliceDoc()).toBe('Plain words here.\n')
  })

  it('links the selection, wrapping addresses with spaces', () => {
    expect(run(at(stateOf('See the orchard.\n'), 'the orchard'), insertLink('https://example.com/orchard')).sliceDoc()).toBe(
      'See [the orchard](https://example.com/orchard).\n',
    )
    expect(run(at(stateOf('See notes.\n'), 'notes'), insertLink('notes/loose ideas.md')).sliceDoc()).toBe(
      'See [notes](<notes/loose ideas.md>).\n',
    )
  })

  it('formats Hebrew text the same way', () => {
    expect(run(at(stateOf('יעל קראה את המכתב.\n', hebrew), 'קראה'), formatCommands.italic).sliceDoc()).toBe('יעל *קראה* את המכתב.\n')
  })
})

describe('direction markers, only when needed (ADR 0004)', () => {
  it('marks an English paragraph in a Hebrew book, and unmarks it', () => {
    const body = 'יעל קראה.\n\nThe letter was sent.\n'
    const marked = run(at(stateOf(body, hebrew), 'letter', 'after'), setParagraphDirection('ltr'))
    expect(marked.sliceDoc()).toBe('יעל קראה.\n\n::: {dir=ltr}\nThe letter was sent.\n:::\n')
    expect(run(at(marked, 'letter', 'after'), setParagraphDirection(null)).sliceDoc()).toBe(body)
  })

  it('writes nothing when the paragraph already has that direction', () => {
    const body = 'יעל קראה.\n'
    expect(run(at(stateOf(body, hebrew), 'קראה', 'after'), setParagraphDirection('rtl')).sliceDoc()).toBe(body)
  })

  it('unmarks a paragraph written with blank lines inside its markers', () => {
    const body = bodyOf(directionMarkers)
    const unmarked = run(at(stateOf(body, hebrew), 'blank lines inside', 'after'), setParagraphDirection(null)).sliceDoc()
    expect(unmarked).not.toContain('::: {dir=ltr}\n\nA paragraph')
    expect(unmarked).toContain('A paragraph written with blank lines inside the markers')
  })

  it('marks a list item with a span, since a list cannot hold a fenced block', () => {
    expect(run(at(stateOf('- אגסים\n- Row two\n', hebrew), 'Row', 'after'), setParagraphDirection('ltr')).sliceDoc()).toBe(
      '- אגסים\n- [Row two]{dir=ltr}\n',
    )
  })

  it('marks an English phrase in Hebrew text, and unmarks it', () => {
    const body = "נואל ענה: It was never anyone's orchard ושתק.\n"
    const marked = run(at(stateOf(body, hebrew), "It was never anyone's orchard"), setPhraseDirection('ltr'))
    expect(marked.sliceDoc()).toBe("נואל ענה: [It was never anyone's orchard]{dir=ltr} ושתק.\n")
    expect(run(at(marked, 'never'), setPhraseDirection(null)).sliceDoc()).toBe(body)
  })

  it("uses the file's own line ending for the markers it writes", () => {
    const marked = run(at(stateOf('יעל.\r\n\r\nThe letter.\r\n', hebrew), 'letter', 'after'), setParagraphDirection('ltr'))
    expect(marked.sliceDoc()).toBe('יעל.\r\n\r\n::: {dir=ltr}\r\nThe letter.\r\n:::\r\n')
  })

  it('hides the marker lines and span brackets', () => {
    const state = stateOf('::: {dir=ltr}\nThe letter.\n:::\n\nנואל ענה: [Never]{dir=ltr} ושתק.\n', hebrew)
    const hidden: string[] = []
    state.field(directionLayout).hidden.between(0, state.doc.length, (from, to) => void hidden.push(state.sliceDoc(from, to)))
    expect(hidden).toEqual(['::: {dir=ltr}', ':::', '[', ']{dir=ltr}'])
  })

  it('protects hidden markers from Backspace at the start of the paragraph', () => {
    const body = 'Before.\n\n::: {dir=ltr}\nThe letter.\n:::\n'
    const state = stateOf(body, hebrew)
    const start = body.indexOf('The letter')
    const backspace = state.update({ changes: { from: start - 1, to: start }, userEvent: 'delete.backward' }).state
    expect(backspace.sliceDoc()).toBe(body)
  })

  it('removes the markers when the author empties the paragraph', () => {
    const body = 'Before.\n\n::: {dir=ltr}\nThe letter.\n:::\nAfter.\n'
    const state = stateOf(body, hebrew)
    const from = body.indexOf('The letter.')
    const emptied = state.update({ changes: { from, to: from + 'The letter.'.length }, userEvent: 'delete.selection' }).state
    expect(emptied.sliceDoc()).toBe('Before.\n\nAfter.\n')
  })
})

describe('pasting', () => {
  it("uses the chapter's own line ending, whatever the clipboard used", () => {
    const state = at(stateOf('Before.\r\n\r\nAfter.\r\n'), 'Before.', 'after')
    expect(run(state, pasteText(' One.\n\nTwo.')).sliceDoc()).toBe('Before. One.\r\n\r\nTwo.\r\n\r\nAfter.\r\n')
    expect(run(at(stateOf('A.\n'), 'A.', 'after'), pasteText(' B.\r\nC.')).sliceDoc()).toBe('A. B.\nC.\n')
  })

  it('replaces the selection', () => {
    expect(run(at(stateOf('The frost came early.\n'), 'frost'), pasteText('*salt*')).sliceDoc()).toBe('The *salt* came early.\n')
  })
})
