import { ensureSyntaxTree } from '@codemirror/language'
import { Compartment, EditorSelection, type EditorState, type StateCommand } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { deleteBackward, deleteForward, renderedRules } from './caret'
import { chapterState } from './chapter-state'
import { letterBefore, moveToLetter, toggleNiqqud } from './niqqud'
import { endsWithBreak, poemFromPlainText, poemJoinStanza, poemLine, poemStanza } from './poem'
import type { EditorSettings } from './settings'

const prose: EditorSettings = {
  projectDirection: 'ltr',
  directionMode: 'project',
  language: 'en',
  labels: { chapterText: 'Chapter text', sceneBreak: 'Scene break' },
}
const poem: EditorSettings = { ...prose, form: 'poem' }
const hebrewPoem: EditorSettings = { ...poem, projectDirection: 'rtl', language: 'he' }

/** `|` marks the cursor. The editor as authors use it, rendered (ADR 0010). */
function stateOf(marked: string, settings = poem): EditorState {
  const at = marked.indexOf('|')
  const text = marked.replace('|', '')
  const state = chapterState(text, new Compartment(), settings, [renderedRules()])
  ensureSyntaxTree(state, state.doc.length, 5000)
  return state.update({ selection: EditorSelection.cursor(at) }).state
}

function run(state: EditorState, command: StateCommand): EditorState {
  let next = state
  ensureSyntaxTree(state, state.doc.length, 5000)
  command({ state, dispatch: (tr) => (next = tr.state) })
  return next
}

/** The text with `|` where the cursor is. */
const shown = (state: EditorState): string => {
  const head = state.selection.main.head
  return state.sliceDoc(0, head) + '|' + state.sliceDoc(head)
}

const type = (state: EditorState, text: string): EditorState =>
  state.update({
    changes: { from: state.selection.main.head, insert: text },
    selection: EditorSelection.cursor(state.selection.main.head + text.length),
    userEvent: 'input.type',
  }).state

describe('typing a poem (ADR 0013)', () => {
  it('Enter starts a new line, and Enter twice a new stanza', () => {
    let state = stateOf('The sea is still tonight|')
    state = run(state, poemLine)
    expect(shown(state)).toBe('The sea is still tonight\\\n|')
    state = type(state, 'and the wind has dropped')
    state = run(state, poemLine)
    state = run(state, poemLine)
    expect(shown(state)).toBe('The sea is still tonight\\\nand the wind has dropped\n\n|')
    state = type(state, 'I sit on the shore')
    expect(state.doc.toString()).toBe('The sea is still tonight\\\nand the wind has dropped\n\nI sit on the shore')
  })

  it('works the same right to left, with niqqud', () => {
    let state = stateOf('הַיָּם שָׁקֵט הָעֶרֶב|', hebrewPoem)
    state = run(state, poemLine)
    state = type(state, 'וְהָרוּחַ נָחָה')
    state = run(state, poemLine)
    state = run(state, poemLine)
    state = type(state, 'אֲנִי יוֹשֶׁבֶת עַל הַחוֹף')
    expect(state.doc.toString()).toBe('הַיָּם שָׁקֵט הָעֶרֶב\\\nוְהָרוּחַ נָחָה\n\nאֲנִי יוֹשֶׁבֶת עַל הַחוֹף')
  })

  it('splits a stanza in the middle, keeping the lines after it together', () => {
    let state = stateOf('one\\\ntwo|\\\nthree')
    state = run(state, poemLine)
    expect(shown(state)).toBe('one\\\ntwo\\\n|\\\nthree')
    state = run(state, poemLine)
    expect(shown(state)).toBe('one\\\ntwo\n\n|\\\nthree')
    state = type(state, 'new')
    expect(state.doc.toString()).toBe('one\\\ntwo\n\nnew\\\nthree')
  })

  it('never splits bold across lines', () => {
    const state = run(stateOf('a **bold|** line\\\nnext'), poemLine)
    expect(state.doc.toString()).toBe('a **bold\\\n** line\\\nnext')
    const after = run(stateOf('a line in **bold|**\\\nnext'), poemLine)
    expect(after.doc.toString()).toBe('a line in **bold**\\\n\\\nnext')
  })

  it('Shift+Enter starts a new stanza at once', () => {
    expect(shown(run(stateOf('one|\\\ntwo'), poemStanza))).toBe('one\n\n|two')
    expect(shown(run(stateOf('one tw|o'), poemStanza))).toBe('one tw\n\n|o')
    expect(shown(run(stateOf('last|'), poemStanza))).toBe('last\n\n|')
  })

  it('Backspace at the start of a stanza joins it to the stanza above', () => {
    const state = run(stateOf('one\\\ntwo\n\n|three'), poemJoinStanza)
    expect(shown(state)).toBe('one\\\ntwo\\\n|three')
  })

  it('Backspace after a line break takes the hidden `\\` with it, in prose too', () => {
    for (const settings of [prose, poem]) {
      const state = run(stateOf('one\\\n|two', settings), deleteBackward)
      expect(shown(state)).toBe('one|two')
    }
    expect(run(stateOf('one|\\\ntwo', prose), deleteForward).doc.toString()).toBe('onetwo')
  })

  it('keeps prose keys in headings, lists and prose chapters', () => {
    expect(shown(run(stateOf('# Title|'), poemLine))).toBe('# Title\n\n|')
    expect(shown(run(stateOf('A paragraph|', prose), poemLine))).toBe('A paragraph\n\n|')
    expect(shown(run(stateOf('A paragraph|', prose), poemStanza))).toBe('A paragraph\\\n|')
    expect(run(stateOf('one\n\n|two', prose), poemJoinStanza).doc.toString()).toBe('one\n\ntwo')
  })

  it('uses the chapter’s own line ending', () => {
    const crlf = chapterState('one\r\ntwo', new Compartment(), poem, [renderedRules()])
    const state = run(crlf.update({ selection: EditorSelection.cursor(crlf.doc.length) }).state, poemLine)
    expect(state.sliceDoc()).toBe('one\r\ntwo\\\r\n')
  })
})

describe('pasting into a poem', () => {
  it('keeps each line, and blank lines as stanza breaks', () => {
    expect(poemFromPlainText('The sea is still\r\nand the wind\r\n\r\nI sit\r\n')).toBe('The sea is still\\\nand the wind\n\nI sit')
    expect(poemFromPlainText('already\\\nbroken')).toBe('already\\\nbroken')
    expect(poemFromPlainText('one line')).toBe('one line')
  })

  it('knows a line break from an escaped backslash', () => {
    expect(endsWithBreak('line\\')).toBe(true)
    expect(endsWithBreak('a path C:\\\\')).toBe(false)
    expect(endsWithBreak('line')).toBe(false)
  })
})

describe('the niqqud picker', () => {
  const QAMATS = '\u05B8'
  const PATAH = '\u05B7'
  const DAGESH = '\u05BC'
  const SHIN_DOT = '\u05C1'
  const SIN_DOT = '\u05C2'

  it('adds a mark to the letter before the cursor, and removes it again', () => {
    let state = stateOf('ב|ית', hebrewPoem)
    state = run(state, toggleNiqqud(DAGESH))
    state = run(state, toggleNiqqud(PATAH))
    expect(shown(state)).toBe(`ב${DAGESH}${PATAH}|ית`)
    state = run(state, toggleNiqqud(DAGESH))
    expect(shown(state)).toBe(`ב${PATAH}|ית`)
  })

  it('replaces a vowel with another, and a shin dot with a sin dot', () => {
    let state = stateOf(`ב${PATAH}|`, hebrewPoem)
    state = run(state, toggleNiqqud(QAMATS))
    expect(state.doc.toString()).toBe(`ב${QAMATS}`)
    state = run(stateOf(`ש${SHIN_DOT}|`, hebrewPoem), toggleNiqqud(SIN_DOT))
    expect(state.doc.toString()).toBe(`ש${SIN_DOT}`)
  })

  it('never reorders the marks already there, whatever order they were typed in', () => {
    // Vowel before dagesh, as some keyboards type it; NFC would put them the other way round.
    const state = run(stateOf(`ש${QAMATS}${DAGESH}|`, hebrewPoem), toggleNiqqud(SHIN_DOT))
    expect(state.doc.toString()).toBe(`ש${QAMATS}${DAGESH}${SHIN_DOT}`)
    expect(letterBefore(state, state.doc.length)).toEqual({ from: 0, to: 4, letter: 'ש', marks: [QAMATS, DAGESH, SHIN_DOT] })
  })

  it('works on the letter whose marks the cursor is among, and only on Hebrew letters', () => {
    const state = stateOf(`ב${DAGESH}|${PATAH}`, hebrewPoem)
    expect(letterBefore(state, state.selection.main.head)?.marks).toEqual([DAGESH, PATAH])
    expect(letterBefore(stateOf('abc|'), 3)).toBeNull()
    expect(letterBefore(stateOf('|שלום'), 0)).toBeNull()
    expect(run(stateOf('a|'), toggleNiqqud(PATAH)).doc.toString()).toBe('a')
  })

  it('moves letter by letter through a word, past its marks', () => {
    let state = stateOf(`|ש${SHIN_DOT}${QAMATS}לום, עולם`, hebrewPoem)
    state = run(state, moveToLetter(true))
    expect(state.selection.main.head).toBe(3)
    state = run(state, moveToLetter(true))
    expect(state.selection.main.head).toBe(4)
    state = run(state, moveToLetter(false))
    expect(state.selection.main.head).toBe(3)
  })
})
