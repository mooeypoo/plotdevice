import { ensureSyntaxTree } from '@codemirror/language'
import { Compartment, EditorSelection, type EditorState, type StateCommand } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { chapterState } from './chapter-state'
import { newParagraph } from './keys'
import { linkQueryIn, nest } from './outline-text'
import type { EditorSettings } from './settings'

const english: EditorSettings = {
  projectDirection: 'ltr',
  directionMode: 'project',
  language: 'en',
  labels: { chapterText: 'Outline text', sceneBreak: 'Scene break' },
}

/** The outline's text with the cursor after `snippet` (or `snippet` selected, with `select`). */
function stateAt(text: string, snippet: string, select = false): EditorState {
  const state = chapterState(text, new Compartment(), english)
  const from = state.doc.toString().indexOf(snippet)
  if (from < 0) throw new Error(`"${snippet}" not found`)
  const selection = select ? EditorSelection.range(from, from + snippet.length) : EditorSelection.cursor(from + snippet.length)
  return state.update({ selection }).state
}

function run(state: EditorState, command: StateCommand): { state: EditorState; handled: boolean } {
  let next = state
  ensureSyntaxTree(state, state.doc.length, 5000)
  const handled = command({ state, dispatch: (tr) => (next = tr.state) })
  return { state: next, handled }
}

const text = (state: EditorState): string => state.sliceDoc()

const OUTLINE = ['## Beginning', '', '- Ilka inherits the orchard', '- The will', '  - Names Marrow', '- The first frost', ''].join('\n')

describe('an outline written as text (Milestone 14)', () => {
  it('Tab makes a card a detail of the one above, carrying its own details with it', () => {
    const { state, handled } = run(stateAt(OUTLINE, 'The will'), nest('in', '  '))
    expect(handled).toBe(true)
    expect(text(state)).toBe(
      ['## Beginning', '', '- Ilka inherits the orchard', '  - The will', '    - Names Marrow', '- The first frost', ''].join('\n'),
    )
  })

  it('Shift+Tab brings a detail back out, and does nothing to a card already at the outer level', () => {
    const out = run(stateAt(OUTLINE, 'Names'), nest('out', '  '))
    expect(text(out.state)).toBe(OUTLINE.replace('  - Names Marrow', '- Names Marrow'))
    const outer = run(stateAt(OUTLINE, 'Ilka'), nest('out', '  '))
    expect(outer.handled).toBe(true)
    expect(text(outer.state)).toBe(OUTLINE)
  })

  it('nests with the file’s own unit: tabs stay tabs, four spaces stay four spaces', () => {
    const tabbed = '- One\n- Two\n\t- Under two\n'
    expect(text(run(stateAt(tabbed, 'Two'), nest('in', '\t')).state)).toBe('- One\n\t- Two\n\t\t- Under two\n')
    const four = '- One\n    - Under one\n'
    expect(text(run(stateAt(four, 'Under'), nest('out', '    ')).state)).toBe('- One\n- Under one\n')
  })

  it('moves every selected line, and leaves a blank line after them where it was', () => {
    const text2 = '- A\n- B\n- C\n\n## Next\n'
    const selected = stateAt(text2, '- B\n- C', true)
    expect(text(run(selected, nest('in', '  ')).state)).toBe('- A\n  - B\n  - C\n\n## Next\n')
  })

  it('leaves Tab alone off a list line, so the keyboard can leave the editor', () => {
    expect(run(stateAt(OUTLINE, '## Begin'), nest('in', '  ')).handled).toBe(false)
  })

  it('Enter on a card starts the next card at the same level, in English and Hebrew, with CRLF kept', () => {
    expect(text(run(stateAt(OUTLINE, 'Names Marrow'), newParagraph).state)).toContain('  - Names Marrow\n  - \n- The first frost')
    const hebrew = '## התחלה\r\n\r\n- אילקה יורשת את הפרדס\r\n'
    expect(text(run(stateAt(hebrew, 'הפרדס'), newParagraph).state)).toBe('## התחלה\r\n\r\n- אילקה יורשת את הפרדס\r\n- \r\n')
  })

  it('finds the link name being typed on the current line only', () => {
    expect(linkQueryIn(stateAt('- Ilka meets @Be\n- Next', '@Be'))).toEqual({ from: 13, text: 'Be' })
    expect(linkQueryIn(stateAt('- with [[Mar', '[[Mar'))).toEqual({ from: 7, text: 'Mar' })
    // An `@` on an earlier line is not what is being typed now.
    expect(linkQueryIn(stateAt('- ask @Bea\n- The gate', 'The gate'))).toBeNull()
    expect(linkQueryIn(stateAt('- mail ilka@marrow', 'marrow'))).toBeNull()
  })
})
