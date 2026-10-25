import { EditorSelection, type ChangeSpec, type EditorState, type StateCommand } from '@codemirror/state'

/** The formatting an author can apply from the menu or the keyboard (ADR 0004). */
export type FormatCommand = 'bold' | 'italic' | 'heading' | 'quote' | 'bulletList' | 'orderedList' | 'sceneBreak'

/** Each command writes plain Markdown, and applying it again removes it. */
export const formatCommands: Record<FormatCommand, StateCommand> = {
  bold: wrap('**'),
  italic: wrap('*'),
  heading: toggleLinePrefix('## '),
  quote: toggleLinePrefix('> '),
  bulletList: toggleLinePrefix('- '),
  orderedList: toggleLinePrefix('1. '),
  sceneBreak: ({ state, dispatch }) => {
    const nl = state.lineBreak
    const line = state.doc.lineAt(state.selection.main.head)
    const insert = `${nl}${nl}* * *${nl}${nl}`
    // Positions count a line break as one, whatever the file's line ending.
    dispatch(state.update({ changes: { from: line.to, insert }, selection: { anchor: line.to + 9 }, userEvent: 'input.format' }))
    return true
  },
}

/** Turns the selection into a link to `url`, or inserts the address as its own text when nothing is selected. */
export const insertLink =
  (url: string): StateCommand =>
  ({ state, dispatch }) => {
    const destination = /[\s()<>]/.test(url) ? `<${url.replace(/[<>]/g, encodeURIComponent)}>` : url
    dispatch(
      state.update(
        state.changeByRange((range) => {
          const text = range.empty ? url : state.sliceDoc(range.from, range.to)
          const insert = `[${text}](${destination})`
          return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) }
        }),
        { userEvent: 'input.format' },
      ),
    )
    return true
  }

function wrap(marker: string): StateCommand {
  return ({ state, dispatch }) => {
    dispatch(
      state.update(
        state.changeByRange((range) => {
          const outer = state.sliceDoc(range.from - marker.length, range.to + marker.length)
          if (outer === marker + state.sliceDoc(range.from, range.to) + marker) {
            return {
              changes: [
                { from: range.from - marker.length, to: range.from },
                { from: range.to, to: range.to + marker.length },
              ],
              range: EditorSelection.range(range.from - marker.length, range.to - marker.length),
            }
          }
          return {
            changes: [
              { from: range.from, insert: marker },
              { from: range.to, insert: marker },
            ],
            range: EditorSelection.range(range.from + marker.length, range.to + marker.length),
          }
        }),
        { userEvent: 'input.format' },
      ),
    )
    return true
  }
}

function toggleLinePrefix(prefix: string): StateCommand {
  return ({ state, dispatch }) => {
    const changes: ChangeSpec[] = []
    const lines = selectedLines(state)
    const allHavePrefix = lines.every((line) => line.text.startsWith(prefix))
    for (const line of lines) {
      if (allHavePrefix) changes.push({ from: line.from, to: line.from + prefix.length })
      else if (!line.text.startsWith(prefix) && line.text.trim() !== '') changes.push({ from: line.from, insert: prefix })
    }
    dispatch(state.update({ changes, userEvent: 'input.format' }))
    return true
  }
}

function selectedLines(state: EditorState) {
  const { from, to } = state.selection.main
  const lines = []
  for (let n = state.doc.lineAt(from).number; n <= state.doc.lineAt(to).number; n++) lines.push(state.doc.line(n))
  return lines
}
