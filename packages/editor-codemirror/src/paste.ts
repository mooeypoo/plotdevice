import { EditorSelection, type StateCommand } from '@codemirror/state'

/** Inserts pasted text at the selection, with the chapter's own line ending whatever the clipboard used. */
export const pasteText =
  (text: string): StateCommand =>
  ({ state, dispatch }) => {
    const lines = text.split(/\r\n|\r|\n/)
    dispatch(
      state.update(
        state.changeByRange((range) => {
          const insert = state.toText(lines.join(state.lineBreak))
          return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) }
        }),
        { scrollIntoView: true, userEvent: 'input.paste' },
      ),
    )
    return true
  }
