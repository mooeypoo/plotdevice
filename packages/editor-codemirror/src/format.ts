import { EditorSelection, type ChangeSpec, type EditorState, type StateCommand } from '@codemirror/state'
import { setPending } from './hidden'

/** The formatting an author can apply from the menu or the keyboard (ADR 0004). */
export type FormatCommand =
  'bold' | 'italic' | 'heading1' | 'heading2' | 'heading3' | 'body' | 'quote' | 'bulletList' | 'orderedList' | 'sceneBreak'

/** Each command writes plain Markdown, and applying it again removes it. */
export const formatCommands: Record<FormatCommand, StateCommand> = {
  bold: wrap('**'),
  italic: wrap('*'),
  heading1: setHeading(1),
  heading2: setHeading(2),
  heading3: setHeading(3),
  body: setHeading(0),
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
/** A link's address as written in Markdown: in angle brackets when it has spaces or brackets. */
export const linkDestination = (url: string): string => (/[\s()<>]/.test(url) ? `<${url.replace(/[<>]/g, encodeURIComponent)}>` : url)

export const insertLink =
  (url: string): StateCommand =>
  ({ state, dispatch }) => {
    const destination = linkDestination(url)
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

/**
 * Bold or italics around the selection, or off again. With nothing selected the marks wait, empty, for
 * what the author types next; rendered editing hides them, and removes them if nothing is typed.
 */
function wrap(marker: string): StateCommand {
  return ({ state, dispatch }) => {
    const { main } = state.selection
    const removing =
      state.sliceDoc(main.from - marker.length, main.to + marker.length) === marker + state.sliceDoc(main.from, main.to) + marker
    const pending = main.empty && !removing ? setPending.of({ from: main.from, marker }) : setPending.of(null)
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
        { userEvent: 'input.format', effects: pending },
      ),
    )
    return true
  }
}

/** A line's quote marks, its bullet or number, and its heading marks: what a heading level replaces. */
const LINE_KIND = /^((?:[ \t]*>[ \t]?)*)([ \t]*(?:[-+*]|\d{1,9}[.)])[ \t]+)?([ \t]{0,3}#{1,6}(?:[ \t]+|$))?/

/**
 * Makes each selected line a heading of `level`, or body text (`0`). A bullet made a heading stops
 * being a bullet, as in Word. Only those marks change, so applying a level twice writes nothing the
 * second time.
 */
function setHeading(level: number): StateCommand {
  return ({ state, dispatch }) => {
    const changes: ChangeSpec[] = []
    const lines = selectedLines(state)
    for (const line of lines) {
      if (line.text.trim() === '' && lines.length > 1) continue
      const match = LINE_KIND.exec(line.text)
      const quotes = match?.[1]?.length ?? 0
      const bullet = match?.[2] ?? ''
      const heading = match?.[3] ?? ''
      const wanted = level > 0 ? `${'#'.repeat(level)} ` : ''
      if (heading.trim() === wanted.trim() && (level === 0 || bullet === '')) continue
      const replaced = level > 0 ? bullet + heading : heading
      const from = line.from + quotes + (level > 0 ? 0 : bullet.length)
      changes.push({ from, to: from + replaced.length, insert: wanted })
    }
    if (changes.length > 0) dispatch(state.update({ changes, scrollIntoView: true, userEvent: 'input.format' }))
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
