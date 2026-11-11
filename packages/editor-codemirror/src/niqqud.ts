import { EditorSelection, type EditorState, type StateCommand } from '@codemirror/state'

/**
 * Niqqud, the Hebrew vowel marks (ADR 0013, point 7). A mark is a character after its letter; the
 * picker adds or removes one on the letter before the cursor. Text is saved exactly as typed: marks
 * already there are never reordered, and nothing is normalised (NFC would reorder Hebrew marks).
 */
export type NiqqudGroup = 'vowel' | 'dagesh' | 'dot'

export interface NiqqudMark {
  /** A stable name, for the interface's words (`niqqud-<id>`). */
  id: string
  mark: string
  /** A letter has one vowel and one dot at most: choosing another replaces it. */
  group: NiqqudGroup
}

export const NIQQUD: readonly NiqqudMark[] = [
  { id: 'qamats', mark: 'ָ', group: 'vowel' },
  { id: 'patah', mark: 'ַ', group: 'vowel' },
  { id: 'tsere', mark: 'ֵ', group: 'vowel' },
  { id: 'segol', mark: 'ֶ', group: 'vowel' },
  { id: 'hiriq', mark: 'ִ', group: 'vowel' },
  { id: 'holam', mark: 'ֹ', group: 'vowel' },
  { id: 'qubuts', mark: 'ֻ', group: 'vowel' },
  { id: 'sheva', mark: 'ְ', group: 'vowel' },
  { id: 'hataf-patah', mark: 'ֲ', group: 'vowel' },
  { id: 'hataf-segol', mark: 'ֱ', group: 'vowel' },
  { id: 'hataf-qamats', mark: 'ֳ', group: 'vowel' },
  { id: 'dagesh', mark: 'ּ', group: 'dagesh' },
  { id: 'shin-dot', mark: 'ׁ', group: 'dot' },
  { id: 'sin-dot', mark: 'ׂ', group: 'dot' },
]

/** Hebrew letters, final forms and the Yiddish ligatures. */
const isLetter = (ch: string): boolean => /[א-תׯ-ײ]/.test(ch)
/** Marks that sit on a letter: niqqud, cantillation, and the rest of Hebrew's combining marks. */
const isMark = (ch: string): boolean => /[֑-ׇֽֿׁׂׅׄ]/.test(ch)

/** The letter the picker works on: a Hebrew letter and the marks after it. */
export interface NiqqudLetter {
  from: number
  to: number
  letter: string
  marks: string[]
}

/** The Hebrew letter just before `pos`, with its marks (`pos` may be inside them), or `null`. */
export function letterBefore(state: EditorState, pos: number): NiqqudLetter | null {
  const line = state.doc.lineAt(pos)
  const text = line.text
  let at = pos - line.from
  // Inside or after a letter's marks: its marks run to the next character that isn't one.
  let end = at
  while (end < text.length && isMark(text.charAt(end))) end++
  while (at > 0 && isMark(text.charAt(at - 1))) at--
  if (at === 0 || !isLetter(text.charAt(at - 1))) return null
  const from = line.from + at - 1
  const to = line.from + end
  return { from, to, letter: text.charAt(at - 1), marks: [...text.slice(at, end)] }
}

/** Adds the mark to the letter before the cursor, replacing another of its group; removes it if it's there. */
export const toggleNiqqud =
  (mark: string): StateCommand =>
  ({ state, dispatch }) => {
    const chosen = NIQQUD.find((n) => n.mark === mark)
    const letter = letterBefore(state, state.selection.main.head)
    if (!chosen || !letter || !state.selection.main.empty) return false
    const has = letter.marks.includes(mark)
    const rivals = new Set(NIQQUD.filter((n) => n.group === chosen.group && chosen.group !== 'dagesh').map((n) => n.mark))
    // The letter's other marks keep their order; the new one goes after them.
    const kept = letter.marks.filter((m) => m !== mark && !(!has && rivals.has(m)))
    const marks = has ? kept : [...kept, mark]
    const insert = letter.letter + marks.join('')
    dispatch(
      state.update({
        changes: { from: letter.from, to: letter.to, insert },
        selection: EditorSelection.cursor(letter.from + insert.length),
        userEvent: 'input',
      }),
    )
    return true
  }

/**
 * Puts the cursor after the next (or previous) Hebrew letter and its marks, so a whole word can be
 * pointed letter by letter. Stays put when there is none on the line.
 */
export const moveToLetter =
  (forward: boolean): StateCommand =>
  ({ state, dispatch }) => {
    const head = state.selection.main.head
    const line = state.doc.lineAt(head)
    const text = line.text
    const current = letterBefore(state, head)
    if (forward) {
      let i = (current ? current.to : head) - line.from
      while (i < text.length && !isLetter(text.charAt(i))) i++
      if (i >= text.length) return false
      let end = i + 1
      while (end < text.length && isMark(text.charAt(end))) end++
      dispatch(state.update({ selection: EditorSelection.cursor(line.from + end), scrollIntoView: true, userEvent: 'select' }))
      return true
    }
    let i = (current ? current.from : head) - line.from - 1
    while (i >= 0 && !isLetter(text.charAt(i))) i--
    if (i < 0) return false
    let end = i + 1
    while (end < text.length && isMark(text.charAt(end))) end++
    dispatch(state.update({ selection: EditorSelection.cursor(line.from + end), scrollIntoView: true, userEvent: 'select' }))
    return true
  }
