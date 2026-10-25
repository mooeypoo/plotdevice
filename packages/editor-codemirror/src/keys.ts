import { insertNewlineContinueMarkup } from '@codemirror/lang-markdown'
import { EditorSelection, type StateCommand } from '@codemirror/state'

/**
 * Enter starts a new paragraph, which in Markdown is a blank line. In lists and quotes it continues
 * the list or quote instead, and on an empty line it adds just one line.
 */
export const newParagraph: StateCommand = (target) => {
  if (insertNewlineContinueMarkup(target)) return true
  const { state, dispatch } = target
  const nl = state.lineBreak
  dispatch(
    state.update(
      state.changeByRange((range) => {
        const line = state.doc.lineAt(range.from)
        const insert = line.text.trim() === '' ? nl : nl + nl
        return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + (insert === nl ? 1 : 2)) }
      }),
      { scrollIntoView: true, userEvent: 'input' },
    ),
  )
  return true
}

/** Shift+Enter: a line break inside the paragraph, written as Markdown's backslash break. */
export const lineBreak: StateCommand = ({ state, dispatch }) => {
  dispatch(
    state.update(
      state.changeByRange((range) => ({ changes: { from: range.from, to: range.to, insert: `\\${state.lineBreak}` }, range: EditorSelection.cursor(range.from + 2) })),
      { scrollIntoView: true, userEvent: 'input' },
    ),
  )
  return true
}
