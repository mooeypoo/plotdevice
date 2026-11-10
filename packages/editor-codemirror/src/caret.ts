import {
  EditorSelection,
  EditorState,
  Facet,
  findClusterBreak,
  Prec,
  type ChangeSpec,
  type Extension,
  type SelectionRange,
  type StateCommand,
  type Transaction,
} from '@codemirror/state'
import { Direction, keymap, type Command, type EditorView } from '@codemirror/view'
import { clusters, hiddenIn, hiddenSource, markdownHidden, pendingFormat, restingPlace, textStart, type Hidden } from './hidden'
import { nest } from './outline-text'
import { endsWithBreak } from './poem'

/**
 * The cursor and editing over hidden marks (ADR 0010, Milestone 16). The author never meets a mark:
 * arrows move past one visible character, Backspace and Delete erase visible characters, and edits
 * that would leave half a pair of marks keep the other half, so nothing hidden ever starts showing.
 */

/** One nesting level of a list, as the file writes it (outlines know theirs; chapters use two spaces). */
export const nestingUnit = Facet.define<(text: string) => string, (text: string) => string>({
  combine: (values) => values[0] ?? (() => '  '),
})

/**
 * Moves `range` with `step` until the cursor rests somewhere new, so a press that only crossed
 * hidden marks carries on to the next visible character. `step` is CodeMirror's own movement, by
 * character or word, which knows the line's direction.
 */
export function moveBy(
  state: EditorState,
  range: SelectionRange,
  step: (range: SelectionRange) => SelectionRange,
  extend: boolean,
): SelectionRange {
  const from = restingPlace(state, range.head)
  let next = EditorSelection.cursor(range.head, range.assoc)
  for (let guard = 0; guard < 1000; guard++) {
    const moved = step(next)
    if (moved.head === next.head) break
    next = moved
    if (restingPlace(state, next.head) !== from) break
  }
  const head = restingPlace(state, next.head)
  return extend ? EditorSelection.range(range.anchor, head) : EditorSelection.cursor(head)
}

function moveSelection(view: EditorView, extend: boolean, step: (range: SelectionRange) => SelectionRange): boolean {
  const { state } = view
  // A selection collapses the way the editor always has.
  if (!extend && state.selection.ranges.some((r) => !r.empty)) return false
  const selection = EditorSelection.create(
    state.selection.ranges.map((r) => moveBy(state, r, step, extend)),
    state.selection.mainIndex,
  )
  if (selection.eq(state.selection)) return false
  view.dispatch({ selection, scrollIntoView: true, userEvent: 'select' })
  return true
}

/** Left or right on screen, whichever way the line runs, by character or by word. */
function arrow(left: boolean, extend: boolean, byWord: boolean): Command {
  return (view) => {
    const ltr = view.textDirectionAt(view.state.selection.main.head) === Direction.LTR
    const forward = left ? !ltr : ltr
    return moveSelection(view, extend, (r) => (byWord ? view.moveByGroup(r, forward) : view.moveByChar(r, forward)))
  }
}

const invisibleAt = (hidden: readonly Hidden[], pos: number, before: boolean): boolean =>
  hidden.some((h) => h.kind !== 'prefix' && h.kind !== 'whole' && (before ? h.from < pos && pos <= h.to : h.from <= pos && pos < h.to))

/**
 * Backspace where something is hidden: at the start of a line's text, a heading becomes body text, a
 * detail moves out a level and a top-level bullet or quote ends. Past hidden marks, the letter before
 * them goes (and the marks stay, see `keepPairs`). Elsewhere the editor's own Backspace runs.
 */
export const deleteBackward: StateCommand = ({ state, dispatch }) => {
  const { main } = state.selection
  if (!main.empty || state.selection.ranges.length > 1) return false
  const pos = main.head
  const line = state.doc.lineAt(pos)
  const hidden = hiddenIn(state, line.from, line.to)
  const start = textStart(hidden, line.from)
  if (start > line.from && pos === start) {
    const last = hidden.filter((h) => h.kind === 'prefix' && h.to <= start).at(-1)
    if (!last) return false
    if (last.shows !== undefined && (last.indent ?? 0) > 0) {
      const unit = state.facet(nestingUnit)(state.doc.toString())
      return nest('out', unit)({ state, dispatch })
    }
    dispatch(state.update({ changes: { from: last.from, to: last.to }, scrollIntoView: true, userEvent: 'delete.backward' }))
    return true
  }
  // At the start of a line after a line break, the break's hidden `\` goes with the line ending, or it
  // would show, glued to the first letter.
  if (pos === line.from && start === line.from && line.number > 1) {
    const previous = state.doc.line(line.number - 1)
    if (endsWithBreak(previous.text)) {
      dispatch(state.update({ changes: { from: previous.to - 1, to: line.from }, scrollIntoView: true, userEvent: 'delete.backward' }))
      return true
    }
  }
  if (!invisibleAt(hidden, pos, true)) return false
  const cluster = clusters(hidden).find((c) => c.from < pos && pos <= c.to)
  if (!cluster) return false
  if (cluster.from <= start) {
    // Nothing visible before the marks on this line: join it to the line above, as Backspace at a line's start does.
    if (line.number === 1) return true
    dispatch(state.update({ changes: { from: line.from - 1, to: line.from }, scrollIntoView: true, userEvent: 'delete.backward' }))
    return true
  }
  const letter = line.from + findClusterBreak(line.text, cluster.from - line.from, false)
  dispatch(state.update({ changes: { from: letter, to: pos }, scrollIntoView: true, userEvent: 'delete.backward' }))
  return true
}

/** Delete before hidden marks: the letter after them goes. Elsewhere the editor's own Delete runs. */
export const deleteForward: StateCommand = ({ state, dispatch }) => {
  const { main } = state.selection
  if (!main.empty || state.selection.ranges.length > 1) return false
  const pos = main.head
  const line = state.doc.lineAt(pos)
  const hidden = hiddenIn(state, line.from, line.to)
  if (!invisibleAt(hidden, pos, false)) return false
  const cluster = clusters(hidden).find((c) => c.from <= pos && pos < c.to)
  if (!cluster) return false
  if (cluster.to >= line.to) {
    // Only marks until the end of the line: join the next line to this one, and a line break's `\` goes too.
    if (line.number === state.doc.lines) return true
    const from = endsWithBreak(line.text) ? line.to - 1 : line.to
    dispatch(state.update({ changes: { from, to: line.to + 1 }, scrollIntoView: true, userEvent: 'delete.forward' }))
    return true
  }
  const letter = line.from + findClusterBreak(line.text, cluster.to - line.from, true)
  dispatch(state.update({ changes: { from: pos, to: letter }, scrollIntoView: true, userEvent: 'delete.forward' }))
  return true
}

/** The author's own deletions and typing: the rules below apply to these, never to the app's commands. */
const byAuthor = (tr: Transaction): boolean =>
  tr.isUserEvent('delete') ||
  tr.isUserEvent('input.type') ||
  tr.isUserEvent('input.paste') ||
  tr.isUserEvent('input.drop') ||
  tr.isUserEvent('move')

/** A deletion through bold or a link keeps the mark whose partner survives; deleting the whole of it takes it all. */
const keepPairs = EditorState.changeFilter.of((tr) => {
  if (!byAuthor(tr)) return true
  const keep: number[] = []
  tr.changes.iterChangedRanges((from, to) => {
    if (from === to) return
    for (const h of hiddenIn(tr.startState, from, to)) {
      if (h.kind === 'prefix' || h.kind === 'whole' || h.to <= from || h.from >= to) continue
      if (from <= h.group.from && to >= h.group.to) continue
      keep.push(h.from, h.to)
    }
  })
  return keep.length > 0 ? keep : true
})

/** Erasing the last letter of bold, italics or a link removes its marks too, instead of leaving `****` or `[](…)`. */
const removeEmptied = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !byAuthor(tr)) return tr
  const pairs = new Map<number, Hidden[]>()
  tr.changes.iterChangedRanges((from, to) => {
    for (const h of hiddenIn(tr.startState, from, to)) {
      if (h.kind !== 'mark' && h.kind !== 'link-open' && h.kind !== 'link-close') continue
      if (h.group.to < from || h.group.from > to) continue
      pairs.set(h.group.from, [...(pairs.get(h.group.from) ?? []), h])
    }
  })
  const removals: ChangeSpec[] = []
  for (const marks of pairs.values()) {
    const [open, close] = marks
    if (marks.length !== 2 || !open || !close) continue
    const openFrom = tr.changes.mapPos(open.from, 1)
    const openTo = tr.changes.mapPos(open.to, -1)
    const closeFrom = tr.changes.mapPos(close.from, 1)
    const closeTo = tr.changes.mapPos(close.to, -1)
    const survived = openTo - openFrom === open.to - open.from && closeTo - closeFrom === close.to - close.from
    if (survived && openTo === closeFrom) removals.push({ from: openFrom, to: closeTo })
  }
  return removals.length > 0 ? [tr, { changes: removals, filter: false, sequential: true }] : tr
})

/** Joining a line to the one above drops its heading, bullet or quote marks: the joined line keeps the first line's kind. */
const joinLines = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !byAuthor(tr)) return tr
  const removals: ChangeSpec[] = []
  tr.changes.iterChanges((fromA, toA) => {
    if (fromA === toA) return
    const { doc } = tr.startState
    const line = doc.lineAt(toA)
    if (line.from !== toA || doc.lineAt(fromA).from === fromA) return
    const start = textStart(hiddenIn(tr.startState, line.from, line.to), line.from)
    if (start > line.from) removals.push({ from: tr.changes.mapPos(toA, 1), to: tr.changes.mapPos(start, 1) })
  })
  return removals.length > 0 ? [tr, { changes: removals, filter: false, sequential: true }] : tr
})

/** A cursor put down by a click, Up, Down, Home or End rests where `restingPlace` says. */
const snapCursor = EditorState.transactionFilter.of((tr) => {
  if (tr.docChanged || !tr.selection) return tr
  const { state } = tr
  let moved = false
  const ranges = tr.selection.ranges.map((r) => {
    if (!r.empty) return r
    const rest = restingPlace(state, r.head)
    if (rest === r.head) return r
    moved = true
    return EditorSelection.cursor(rest)
  })
  return moved ? [tr, { selection: EditorSelection.create(ranges, tr.selection.mainIndex), sequential: true }] : tr
})

/** Bold or italics switched on and left without a letter typed: its marks go when the cursor leaves. */
const dropPending = EditorState.transactionFilter.of((tr) => {
  const pending = tr.startState.field(pendingFormat, false)
  if (!pending || !tr.selection || tr.docChanged) return tr
  const middle = pending.from + pending.marker.length
  if (tr.selection.main.empty && tr.selection.main.head === middle) return tr
  const removal = { from: pending.from, to: pending.from + pending.marker.length * 2 }
  return [tr, { changes: removal, filter: false, sequential: true }]
})

export interface RenderedRuleOptions {
  /** One nesting level as the file writes it; outlines pass their own (ADR 0003). */
  nestingUnit?: (text: string) => string
  /** What is hidden; a chapter's Markdown unless said otherwise (a card's one line has its own). */
  source?: (state: EditorState, from: number, to: number) => Hidden[]
}

/** The rules of rendered editing that need no screen: what's hidden, and how edits treat it. */
export function renderedRules(options: RenderedRuleOptions = {}): Extension {
  return [
    hiddenSource.of(options.source ?? markdownHidden),
    pendingFormat,
    options.nestingUnit ? nestingUnit.of(options.nestingUnit) : [],
    keepPairs,
    removeEmptied,
    joinLines,
    snapCursor,
    dropPending,
  ]
}

/** The keys: ahead of the editor's own and the Markdown package's (whose Backspace would take a bullet's mark and leave its indentation); those still run wherever nothing is hidden. */
export const caretKeymap: Extension = Prec.highest(
  keymap.of([
    { key: 'ArrowLeft', run: arrow(true, false, false), shift: arrow(true, true, false) },
    { key: 'ArrowRight', run: arrow(false, false, false), shift: arrow(false, true, false) },
    { key: 'Mod-ArrowLeft', mac: 'Alt-ArrowLeft', run: arrow(true, false, true), shift: arrow(true, true, true) },
    { key: 'Mod-ArrowRight', mac: 'Alt-ArrowRight', run: arrow(false, false, true), shift: arrow(false, true, true) },
    { key: 'Backspace', run: deleteBackward },
    { key: 'Delete', run: deleteForward },
  ]),
)
