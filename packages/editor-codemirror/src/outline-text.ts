import { EditorSelection, Prec, type ChangeSpec, type EditorState, type Extension, type StateCommand } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { linkQueryAt } from './item-text'

/**
 * An outline written as text (Milestone 14), in the chapter editor: Tab and Shift+Tab move a list line
 * in or out a level, carrying what is nested under it, and `@` or `[[` offers pages to link, as in a
 * card's text. Everything else is the chapter editor's: Enter continues the list, undo, paste.
 */
export interface OutlineTextOptions {
  /** One nesting level as the file writes it, so new levels match the author's (ADR 0003). */
  nestingUnit: (text: string) => string
  /** The name being typed after `@` or `[[`, and where on screen it is; `null` when none. */
  onLinkQuery: (query: { text: string; x: number; y: number } | null) => void
  /** Keys while a list of pages is offered; `true` when the app used the key. */
  onListKey: (key: 'up' | 'down' | 'pick' | 'close') => boolean
}

const LIST_LINE = /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/
const indentOf = (text: string): number => /^[ \t]*/.exec(text)?.[0].replace(/\t/g, '    ').length ?? 0

/**
 * The lines Tab moves: every line the selection touches, and what is nested under the last of them
 * (deeper lines, blank lines between them). `null` unless the selection starts on a list line.
 */
function linesToMove(state: EditorState): number[] | null {
  const { main } = state.selection
  const first = state.doc.lineAt(main.from)
  if (!LIST_LINE.test(first.text)) return null
  const last = state.doc.lineAt(main.to)
  const lines: number[] = []
  for (let n = first.number; n <= last.number; n++) lines.push(n)
  const depth = indentOf(last.text)
  for (let n = last.number + 1; n <= state.doc.lines; n++) {
    const text = state.doc.line(n).text
    if (text.trim() !== '' && indentOf(text) <= depth) break
    lines.push(n)
  }
  // Blank lines after the nested part belong to what follows.
  while (lines.length > 1 && state.doc.line(lines.at(-1) ?? 1).text.trim() === '') lines.pop()
  return lines
}

/** Tab (`in`) or Shift+Tab (`out`) on a list line. Off a list line it does nothing, so Tab leaves the editor. */
export function nest(direction: 'in' | 'out', unit: string): StateCommand {
  return ({ state, dispatch }) => {
    const lines = linesToMove(state)
    if (!lines) return false
    const changes = lines.flatMap((n): ChangeSpec[] => {
      const line = state.doc.line(n)
      if (line.text.trim() === '') return []
      if (direction === 'in') return [{ from: line.from, insert: unit }]
      const leading = /^[ \t]*/.exec(line.text)?.[0] ?? ''
      const remove = leading.startsWith(unit) ? unit.length : leading.startsWith('\t') ? 1 : Math.min(leading.length, unit.length)
      return remove > 0 ? [{ from: line.from, to: line.from + remove }] : []
    })
    // At the outermost level Shift+Tab has nothing to do, but it is still the outline's key.
    if (changes.length > 0)
      dispatch(state.update({ changes, scrollIntoView: true, userEvent: direction === 'in' ? 'indent' : 'delete.dedent' }))
    return true
  }
}

/** The link name being typed where the cursor is, in document offsets: only the current line is read. */
export function linkQueryIn(state: EditorState): { from: number; text: string } | null {
  const { main } = state.selection
  if (!main.empty) return null
  const line = state.doc.lineAt(main.head)
  const found = linkQueryAt(line.text, main.head - line.from)
  return found ? { from: line.from + found.from, text: found.text } : null
}

/** Puts a chosen link in place of the `@name` being typed, or at the cursor, with a space to carry on typing. */
export function insertChosenLink(view: EditorView, markdown: string): void {
  const found = linkQueryIn(view.state)
  const { main } = view.state.selection
  const from = found?.from ?? main.from
  const to = found ? main.head : main.to
  const insert = `${markdown} `
  view.dispatch({ changes: { from, to, insert }, selection: EditorSelection.cursor(from + insert.length), userEvent: 'input' })
  view.focus()
}

export function outlineText(options: OutlineTextOptions, text: string): Extension {
  const unit = options.nestingUnit(text)
  const list = (key: 'up' | 'down' | 'pick' | 'close') => (): boolean => options.onListKey(key)
  const report = (view: EditorView): void => {
    const found = view.hasFocus ? linkQueryIn(view.state) : null
    const place = found ? view.coordsAtPos(found.from) : null
    options.onLinkQuery(found && place ? { text: found.text, x: place.left, y: place.bottom } : null)
  }
  return [
    // Ahead of the chapter's keys: while pages are offered, these keys choose among them.
    Prec.highest(
      keymap.of([
        { key: 'ArrowDown', run: list('down') },
        { key: 'ArrowUp', run: list('up') },
        { key: 'Enter', run: list('pick') },
        { key: 'Escape', run: list('close') },
        { key: 'Tab', run: (view) => options.onListKey('pick') || nest('in', unit)(view), shift: nest('out', unit) },
      ]),
    ),
    EditorView.updateListener.of((update) => {
      if (update.docChanged || update.selectionSet || update.focusChanged) report(update.view)
    }),
  ]
}
