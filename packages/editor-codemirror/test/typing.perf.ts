import { ensureSyntaxTree } from '@codemirror/language'
import { Compartment, EditorSelection, type EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { deleteBackward, renderedRules } from '../src/caret'
import { chapterState } from '../src/chapter-state'
import { hiddenIn, restingPlace } from '../src/hidden'
import { directionHiding } from '../src/paragraph-direction'
import type { EditorSettings } from '../src/settings'

// Milestone 16: rendered editing must not slow typing. A keystroke in a 150,000-character chapter,
// with its rules and a screenful of hidden marks worked out again, stays within one frame. CI machines
// are slower and shared, so CI allows twice this.
const SLACK = process.env.CI ? 2 : 1
const FRAME_MS = 16

const settings: EditorSettings = {
  projectDirection: 'rtl',
  directionMode: 'project',
  language: 'he',
  labels: { chapterText: 'Chapter text', sceneBreak: 'Scene break' },
}

/** A long chapter in Hebrew and English, with bold, italics, links, headings, lists and direction spans. */
function longChapter(): string {
  const paragraphs = [
    'אילקה עמדה מול **השער** ולא זזה. [בּיה](../characters/bea.md) חיכתה בצד השני של הנהר, *בשקט*.',
    'The letter from Szeged was written in **English**, and it began without a greeting: [Never]{dir=ltr}.',
    '## הכפור',
    '- שורה ראשונה: אגסים\n  - [the north rows](../places/north.md)\n- Row two: apples',
    '> "Do not sell the north rows." — מהמכתב של דודה בּיה',
  ]
  const parts: string[] = []
  for (let length = 0; length < 150_000; length += (parts.at(-1)?.length ?? 0) + 2)
    parts.push(paragraphs[parts.length % paragraphs.length] ?? '')
  return parts.join('\n\n')
}

function median(action: () => void): number {
  const times: number[] = []
  for (let run = 0; run < 15; run++) {
    const start = performance.now()
    action()
    times.push(performance.now() - start)
  }
  return times.sort((a, b) => a - b)[7] ?? Number.POSITIVE_INFINITY
}

describe('typing with rendered editing (Milestone 16)', () => {
  const text = longChapter()
  const base = chapterState(text, new Compartment(), settings, [renderedRules(), directionHiding])
  ensureSyntaxTree(base, base.doc.length, 60_000)
  const middle = base.doc.line(Math.floor(base.doc.lines / 2))
  const at = (state: EditorState, pos: number): EditorState => state.update({ selection: EditorSelection.cursor(pos) }).state
  const screen = (state: EditorState, pos: number): number => hiddenIn(state, pos, Math.min(state.doc.length, pos + 3000)).length

  it('is a long chapter', () => {
    expect(text.length).toBeGreaterThanOrEqual(150_000)
  })

  it('a letter typed in the middle', () => {
    const start = at(base, middle.to)
    const ms = median(() => {
      const next = start.update({ changes: { from: middle.to, insert: 'א' }, userEvent: 'input.type' }).state
      ensureSyntaxTree(next, middle.to + 3000, 5000)
      screen(next, middle.from)
      restingPlace(next, middle.to + 1)
    })
    expect(ms).toBeLessThan(FRAME_MS * SLACK)
  })

  it('Backspace past hidden marks in the middle', () => {
    const bold = base.doc.toString().indexOf('**השער**', middle.from) + '**השער**'.length
    const start = base.update({ changes: { from: 0, to: 0, insert: '' }, selection: EditorSelection.cursor(bold) }).state
    const ms = median(() => {
      deleteBackward({ state: start, dispatch: (tr) => ensureSyntaxTree(tr.state, bold + 3000, 5000) })
    })
    expect(ms).toBeLessThan(FRAME_MS * SLACK)
  })
})
