import { naturalDirection, type Direction } from '@plotdevice/domain'
import { EditorState, StateField, type ChangeSpec, type Range, type StateCommand } from '@codemirror/state'
import { Decoration, Direction as BidiDirection, EditorView, type DecorationSet } from '@codemirror/view'
import { DIV_CLOSE, DIV_OPEN, findSpans, LINE_PREFIX, openDiv, wholeLineSpan, wrapSpan } from './direction-markers'
import { editorSettings } from './settings'

/**
 * Direction in the editor: per-line `dir` (which CodeMirror reads for cursor motion, thanks to
 * `perLineTextDirection`), Pandoc markers hidden and protected, and `[…]{dir=…}` spans shown as
 * bidi-isolated ranges so arrow keys move through them the way the text is displayed.
 */
export interface Div {
  open: { from: number; to: number }
  close: { from: number; to: number }
  direction: Direction
}

interface Layout {
  decorations: DecorationSet
  /** Ranges the caret skips as a unit: hidden marker lines and span brackets. */
  hidden: DecorationSet
  isolates: DecorationSet
  divs: Div[]
}

const hideLine = Decoration.replace({ block: true })
const hideMarkup = Decoration.replace({})

export function findDivs(state: EditorState): Div[] {
  const divs: Div[] = []
  let open: { from: number; to: number; direction: Direction } | null = null
  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n)
    const opening = DIV_OPEN.exec(line.text)
    if (!open && opening) open = { from: line.from, to: line.to, direction: opening[1] as Direction }
    else if (open && DIV_CLOSE.test(line.text)) {
      divs.push({ open: { from: open.from, to: open.to }, close: { from: line.from, to: line.to }, direction: open.direction })
      open = null
    }
  }
  return divs
}

function layout(state: EditorState): Layout {
  const { directionMode } = state.facet(editorSettings)
  const divs = findDivs(state)
  const lines: Range<Decoration>[] = []
  const hidden: Range<Decoration>[] = []
  const isolates: Range<Decoration>[] = []
  let divIndex = 0
  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n)
    const div = divs[divIndex]
    if (div && (line.from === div.open.from || line.from === div.close.from)) {
      hidden.push(hideLine.range(line.from, line.to))
      if (line.from === div.close.from) divIndex++
      continue
    }
    for (const span of findSpans(line.text, line.from)) {
      hidden.push(hideMarkup.range(span.from, span.contentFrom), hideMarkup.range(span.contentTo, span.to))
      if (span.contentTo > span.contentFrom) {
        const bidiIsolate = span.direction === 'rtl' ? BidiDirection.RTL : BidiDirection.LTR
        isolates.push(Decoration.mark({ attributes: { dir: span.direction }, class: 'cm-dir-span', bidiIsolate }).range(span.contentFrom, span.contentTo))
      }
    }
    const inDiv = div && line.from > div.open.from && line.from < div.close.from
    const dir = (inDiv ? div.direction : null) ?? wholeLineSpan(line.text)?.direction ?? (directionMode === 'auto' ? 'auto' : null)
    if (dir) lines.push(Decoration.line({ attributes: { dir } }).range(line.from))
  }
  return {
    decorations: Decoration.set([...lines, ...hidden, ...isolates], true),
    hidden: Decoration.set(hidden, true),
    isolates: Decoration.set(isolates, true),
    divs,
  }
}

export const directionLayout = StateField.define<Layout>({
  create: layout,
  update: (value, tr) => (tr.docChanged || tr.startState.facet(editorSettings) !== tr.state.facet(editorSettings) ? layout(tr.state) : value),
  provide: (field) => [
    EditorView.decorations.from(field, (l) => l.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).hidden),
    EditorView.bidiIsolatedRanges.of((view) => view.state.field(field).isolates),
  ],
})

/**
 * Hidden marker lines (and the line breaks that attach them to the paragraph) cannot be edited by
 * typing; otherwise Backspace at the start of a paragraph would glue it to an invisible `:::` line.
 * Deleting the whole wrapped paragraph removes its markers too. The app's own commands pass `filter: false`.
 */
const protectMarkers = EditorState.changeFilter.of((tr) => {
  const protectedRanges: number[] = []
  for (const div of tr.startState.field(directionLayout).divs) {
    let coversWholeDiv = false
    tr.changes.iterChangedRanges((from, to) => {
      if (from <= div.open.from && to >= div.close.to) coversWholeDiv = true
    })
    if (!coversWholeDiv) protectedRanges.push(div.open.from, div.open.to + 1, Math.max(div.close.from - 1, div.open.to + 1), div.close.to)
  }
  return protectedRanges.length ? protectedRanges : true
})

/** When the author empties a marked paragraph, its markers go too, instead of lingering in the file. */
const removeEmptyDivs = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const empty = findDivs(tr.state).filter((div) => tr.state.doc.sliceString(div.open.to, div.close.from).trim() === '')
  if (empty.length === 0) return tr
  const changes = empty.map((div) => ({ from: div.open.from, to: Math.min(div.close.to + 1, tr.state.doc.length) }))
  return [tr, { changes, filter: false, sequential: true }]
})

export const paragraphDirection = [directionLayout, protectMarkers, removeEmptyDivs, EditorView.perLineTextDirection.of(true)]

const LIST_OR_QUOTE = /^[ \t]*(?:>|[-+*][ \t]|\d{1,9}[.)][ \t])/

function effectiveDirection(state: EditorState, text: string): Direction {
  const { directionMode, projectDirection } = state.facet(editorSettings)
  return naturalDirection(text, directionMode, projectDirection)
}

/** The paragraph around `pos`: its lines, and the Pandoc div wrapping it, if any. */
function paragraphAt(state: EditorState, pos: number) {
  const { doc } = state
  let first = doc.lineAt(pos)
  let last = first
  const isBreak = (n: number): boolean => n < 1 || n > doc.lines || doc.line(n).text.trim() === '' || /^:::/.test(doc.line(n).text)
  while (!isBreak(first.number - 1)) first = doc.line(first.number - 1)
  while (!isBreak(last.number + 1)) last = doc.line(last.number + 1)
  // Some authors leave blank lines inside the markers; the paragraph is still the one they wrap.
  const onlyBlank = (from: number, to: number): boolean => from <= to && state.sliceDoc(from, to).trim() === ''
  const div = state.field(directionLayout).divs.find((d) => onlyBlank(d.open.to, first.from) && onlyBlank(last.to, d.close.from))
  return { first, last, div }
}

/**
 * Sets the direction of the paragraph at the cursor; `null` removes the override. Writes nothing when the
 * paragraph already shows that direction ("only when needed").
 */
export const setParagraphDirection =
  (direction: Direction | null): StateCommand =>
  ({ state, dispatch }) => {
    const line = state.doc.lineAt(state.selection.main.head)
    const prefix = LINE_PREFIX.exec(line.text)?.[0] ?? ''
    // A line break is one position in the document, but inserted text must use the file's own line ending.
    const nl = state.lineBreak
    if (LIST_OR_QUOTE.test(prefix)) {
      // A list item or quote line: a fenced div would break the list, so its text becomes a span.
      const inner = wholeLineSpan(line.text)?.inner ?? line.text.slice(prefix.length)
      const needed = direction !== null && direction !== effectiveDirection(state, inner)
      dispatch(state.update({ changes: { from: line.from + prefix.length, to: line.to, insert: needed ? wrapSpan(inner, direction) : inner }, userEvent: 'input.direction' }))
      return true
    }
    const { first, last, div } = paragraphAt(state, line.from)
    const needed = direction !== null && direction !== effectiveDirection(state, state.sliceDoc(first.from, last.to))
    let changes: ChangeSpec[] = []
    if (div && needed) changes = [{ from: div.open.from, to: div.open.to, insert: openDiv(direction) }]
    else if (div) changes = [{ from: div.open.from, to: div.open.to + 1 }, { from: div.close.from - 1, to: div.close.to }]
    else if (needed) changes = [{ from: first.from, insert: `${openDiv(direction)}${nl}` }, { from: last.to, insert: `${nl}:::` }]
    if (changes.length) dispatch(state.update({ changes, filter: false, userEvent: 'input.direction' }))
    return true
  }

/** Marks the selected phrase with a direction; `null` removes the mark. Same "only when needed" rule. */
export const setPhraseDirection =
  (direction: Direction | null): StateCommand =>
  ({ state, dispatch }) => {
    const { from, to } = state.selection.main
    const line = state.doc.lineAt(from)
    const existing = findSpans(line.text, line.from).find((s) => s.contentFrom <= from && to <= s.contentTo)
    const start = existing ? existing.contentFrom : from
    const end = existing ? existing.contentTo : Math.min(to, line.to)
    if (start === end) return false
    const lineDirection = wholeLineSpan(line.text)?.direction ?? effectiveDirection(state, line.text)
    const needed = direction !== null && direction !== lineDirection
    let changes: ChangeSpec[] = []
    if (existing && needed) changes = [{ from: existing.contentTo, to: existing.to, insert: `]{dir=${direction}}` }]
    else if (existing) changes = [{ from: existing.from, to: existing.contentFrom }, { from: existing.contentTo, to: existing.to }]
    else if (needed) changes = [{ from: start, insert: '[' }, { from: end, insert: `]{dir=${direction}}` }]
    if (changes.length) dispatch(state.update({ changes, userEvent: 'input.direction' }))
    return true
  }
