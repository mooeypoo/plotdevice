import { EditorSelection, type EditorState, type Line, type StateCommand } from '@codemirror/state'
import { hiddenIn } from './hidden'
import { lineBreak, newParagraph } from './keys'
import { editorSettings } from './settings'

/**
 * Typing a poem (ADR 0013). A poem is stored like prose with line breaks: each line but a stanza's
 * last ends with Markdown's `\`, and an empty line starts a new stanza. Enter writes a new line,
 * Enter on an empty line (Enter twice) or Shift+Enter starts a new stanza, and Backspace at the start
 * of a stanza joins it to the one above. Headings, lists, quotes and scene breaks keep prose keys.
 */

/** A line ending in Markdown's backslash line break (an odd number of `\`, so not an escaped one). */
export function endsWithBreak(text: string): boolean {
  const slashes = /\\+$/.exec(text)?.[0].length ?? 0
  return slashes % 2 === 1
}

/** A line with nothing to read on it: blank, or only a line break's `\`. */
const isEmptyLine = (text: string): boolean => (endsWithBreak(text) ? text.slice(0, -1) : text).trim() === ''

/** Lines whose Enter belongs to prose: headings, bullets, numbers, quotes, scene breaks and direction fences. */
const isBlockLine = (text: string): boolean =>
  /^\s{0,3}(#{1,6}(\s|$)|>|[-+*]\s|\d{1,9}[.)]\s|:::)/.test(text) || /^\s{0,3}([*\-_])(\s*\1){2,}\s*$/.test(text)

const isPoem = (state: EditorState): boolean => state.facet(editorSettings).form === 'poem'

/**
 * Where a new line starts: at the cursor, or, when only hidden marks follow it on the line (a closing
 * `**`, a link's address), after them, so bold or a link is never split across two lines. A line
 * break's own `\` stays at the end of the line it belongs to.
 */
function breakPoint(state: EditorState, line: Line, pos: number): number {
  const end = endsWithBreak(line.text) ? line.to - 1 : line.to
  if (pos >= end) return end
  const hidden = hiddenIn(state, line.from, line.to).filter((h) => h.kind === 'mark' || h.kind === 'link-close')
  let at = pos
  for (const h of hidden) if (h.from <= at && h.to > at) at = h.to
  return at >= end ? end : pos
}

/** Enter in a poem: a new line; on an empty line, a new stanza. */
export const poemLine: StateCommand = (target) => {
  const { state, dispatch } = target
  if (!isPoem(state)) return newParagraph(target)
  const { main } = state.selection
  const line = state.doc.lineAt(main.head)
  if (state.selection.ranges.length > 1 || isBlockLine(line.text)) return newParagraph(target)
  const nl = state.lineBreak
  if (main.empty && isEmptyLine(line.text) && line.number > 1) {
    const previous = state.doc.line(line.number - 1)
    if (!isEmptyLine(previous.text) && !isBlockLine(previous.text)) {
      // The line above ends the stanza: its `\` goes, and a blank line separates the stanzas. The cursor
      // stays on this line, which now starts the next stanza.
      const dropped = endsWithBreak(previous.text) ? 1 : 0
      dispatch(
        state.update({
          changes: [...(dropped ? [{ from: previous.to - 1, to: previous.to }] : []), { from: line.from, insert: nl }],
          selection: EditorSelection.cursor(line.from - dropped + 1),
          scrollIntoView: true,
          userEvent: 'input',
        }),
      )
      return true
    }
  }
  const at = main.empty ? breakPoint(state, line, main.head) : main.from
  const insert = `\\${nl}`
  dispatch(
    state.update({
      changes: { from: at, to: main.empty ? at : main.to, insert },
      selection: EditorSelection.cursor(at + 2),
      scrollIntoView: true,
      userEvent: 'input',
    }),
  )
  return true
}

/** Shift+Enter in a poem: a new stanza from here. In prose, a line break, as always. */
export const poemStanza: StateCommand = (target) => {
  const { state, dispatch } = target
  if (!isPoem(state)) return lineBreak(target)
  const { main } = state.selection
  const line = state.doc.lineAt(main.head)
  if (state.selection.ranges.length > 1 || !main.empty || isBlockLine(line.text)) return newParagraph(target)
  const nl = state.lineBreak
  const at = breakPoint(state, line, main.head)
  // At the end of a line that has a line break, the break becomes the stanza's blank line.
  const replacesBreak = endsWithBreak(line.text) && at === line.to - 1
  dispatch(
    state.update({
      changes: replacesBreak ? { from: at, to: line.to, insert: nl } : { from: at, insert: nl + nl },
      selection: EditorSelection.cursor(at + 2),
      scrollIntoView: true,
      userEvent: 'input',
    }),
  )
  return true
}

/** Backspace at the start of a stanza in a poem: it joins the stanza above, as its next line. */
export const poemJoinStanza: StateCommand = ({ state, dispatch }) => {
  if (!isPoem(state)) return false
  const { main } = state.selection
  if (!main.empty || state.selection.ranges.length > 1) return false
  const line = state.doc.lineAt(main.head)
  if (main.head !== line.from || line.number < 3 || isBlockLine(line.text)) return false
  const blank = state.doc.line(line.number - 1)
  const above = state.doc.line(line.number - 2)
  if (blank.text.trim() !== '' || isEmptyLine(above.text) || isBlockLine(above.text) || endsWithBreak(above.text)) return false
  const insert = `\\${state.lineBreak}`
  dispatch(
    state.update({
      changes: { from: above.to, to: line.from, insert },
      selection: EditorSelection.cursor(above.to + 2),
      scrollIntoView: true,
      userEvent: 'delete.backward',
    }),
  )
  return true
}

/**
 * Pasted lines in a poem keep their places: each line but a stanza's last gets a line break, and blank
 * lines stay stanza breaks. Plain text is used, where each line of a poem from Word or an email is
 * one line (its HTML would make every line a paragraph).
 */
export function poemFromPlainText(plain: string): string {
  const lines = plain.replace(/\r\n?/g, '\n').split('\n')
  while (lines.length > 1 && lines.at(-1)?.trim() === '') lines.pop()
  return lines
    .map((text, i) => {
      const next = lines[i + 1]
      const clean = text.replace(/\s+$/, '')
      return next !== undefined && next.trim() !== '' && clean !== '' && !endsWithBreak(clean) ? `${clean}\\` : clean
    })
    .join('\n')
}
