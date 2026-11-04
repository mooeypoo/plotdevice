import { syntaxTree } from '@codemirror/language'
import { Facet, StateEffect, StateField, type EditorState } from '@codemirror/state'
import { findSpans } from './direction-markers'

/**
 * What rendered editing hides (ADR 0010), as plain facts about the text: the marks, the line prefixes,
 * and the few things drawn instead of their text. The editor's drawing, the arrow keys, Backspace and
 * the edit rules all read these, so they can't disagree. Nothing here changes the text.
 */
export type HiddenKind =
  /** A heading's `## `, a quote's `> `, a bullet or number with its indentation: at the start of a line. */
  | 'prefix'
  /** Bold and italic marks, a line break's `\`, direction brackets: invisible, in pairs or alone. */
  | 'mark'
  /** A link's `[` (or a wikilink's `[[target|`). */
  | 'link-open'
  /** A link's `](address)` (or a wikilink's `]]`). */
  | 'link-close'
  /** Something drawn as a whole, which the cursor steps over: a scene break, a wikilink without a label. */
  | 'whole'

export interface Hidden {
  from: number
  to: number
  kind: HiddenKind
  /** What it belongs to (bold, a link, a direction span). Marks of the same group are partners. */
  group: { from: number; to: number }
  /** Drawn instead of the text: a bullet, a list number, ⁂, a page's name. Nothing is drawn without it. */
  shows?: string
  /** For a bullet or number: how far the line is indented, in columns. */
  indent?: number
}

/** Finds what is hidden in the lines from `from` to `to`; each kind of editor brings its own. */
export const hiddenSource = Facet.define<(state: EditorState, from: number, to: number) => Hidden[]>()

/** Everything hidden on the lines touching `from`–`to`, in order. */
export function hiddenIn(state: EditorState, from: number, to: number): Hidden[] {
  const start = state.doc.lineAt(from).from
  const end = state.doc.lineAt(to).to
  return state
    .facet(hiddenSource)
    .flatMap((source) => source(state, start, end))
    .sort((a, b) => a.from - b.from || a.to - b.to)
}

/** Bold or italics switched on with nothing typed yet: `****`, with the cursor between its marks. */
export const setPending = StateEffect.define<{ from: number; marker: string } | null>()

export const pendingFormat = StateField.define<{ from: number; marker: string } | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setPending)) return effect.value
    if (!value) return value
    const from = tr.changes.mapPos(value.from, 1)
    const to = tr.changes.mapPos(value.from + value.marker.length * 2, -1)
    // Typed into, it is ordinary bold now; if its marks were changed, it's no longer pending.
    return to - from === value.marker.length * 2 && tr.state.sliceDoc(from, to) === value.marker.repeat(2) ? { ...value, from } : null
  },
})

function pendingHidden(state: EditorState, from: number, to: number): Hidden[] {
  const pending = state.field(pendingFormat, false)
  if (!pending || pending.from < from || pending.from > to) return []
  const length = pending.marker.length
  const group = { from: pending.from, to: pending.from + length * 2 }
  return [
    { from: group.from, to: group.from + length, kind: 'mark', group },
    { from: group.from + length, to: group.to, kind: 'mark', group },
  ]
}

/** Shown as written, never hidden: Markdown the editor doesn't format (ADR 0004, unsupported Markdown). */
export const KEPT = new Set([
  'HTMLBlock',
  'HTMLTag',
  'Comment',
  'CommentBlock',
  'Table',
  'FencedCode',
  'CodeBlock',
  'Image',
  'LinkReference',
])

const WIKI = /\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g
const CODE = /`[^`\n]*`/g
const columns = (text: string): number => text.replace(/\t/g, '    ').length

/** What the Markdown parser says is hidden, plus wikilinks and direction brackets, which it doesn't know. */
export function markdownHidden(state: EditorState, from: number, to: number): Hidden[] {
  const found: Hidden[] = [...pendingHidden(state, from, to)]
  const { doc } = state
  /** Where each line's prefixes end so far, so a bullet inside a quote starts after the quote's mark. */
  const prefixEnd = new Map<number, number>()
  const addPrefix = (lineFrom: number, start: number, end: number, extra: Partial<Hidden> = {}): void => {
    const begin = Math.max(start, prefixEnd.get(lineFrom) ?? lineFrom)
    found.push({ from: begin, to: end, kind: 'prefix', group: { from: begin, to: end }, ...extra })
    prefixEnd.set(lineFrom, end)
  }
  /** The mark, and the one space or tab after it, if there is one. */
  const withSpace = (end: number): number => (/[ \t]/.test(doc.sliceString(end, end + 1)) ? end + 1 : end)

  syntaxTree(state).iterate({
    from,
    to,
    enter: (node) => {
      const name = node.name
      if (KEPT.has(name) || name === 'InlineCode') return false
      const parent = node.node.parent
      if (name === 'HeaderMark' && parent?.name.startsWith('ATXHeading')) {
        if (node.from === parent.from) {
          // Only once it's understood: "#" with nothing after it is still being typed.
          if (/[ \t]/.test(doc.sliceString(node.to, node.to + 1))) addPrefix(doc.lineAt(node.from).from, node.from, withSpace(node.to))
        } else {
          // Closing hashes: `## Title ##`.
          found.push({ from: node.from, to: node.to, kind: 'mark', group: { from: node.from, to: node.to } })
        }
      } else if (name === 'QuoteMark') {
        const line = doc.lineAt(node.from)
        addPrefix(line.from, node.from, withSpace(node.to))
      } else if (name === 'ListMark') {
        const line = doc.lineAt(node.from)
        const mark = doc.sliceString(node.from, node.to)
        const end = withSpace(node.to)
        // Indentation before the mark belongs to the prefix; it is drawn as indentation.
        let start = node.from
        while (start > line.from && /[ \t]/.test(doc.sliceString(start - 1, start))) start--
        const begin = Math.max(start, prefixEnd.get(line.from) ?? line.from)
        addPrefix(line.from, begin, end, { shows: /^[-+*]$/.test(mark) ? '•' : mark, indent: columns(doc.sliceString(begin, node.from)) })
      } else if (name === 'HorizontalRule') {
        found.push({ from: node.from, to: node.to, kind: 'whole', group: { from: node.from, to: node.to }, shows: '⁂' })
      } else if (name === 'EmphasisMark' && parent) {
        found.push({ from: node.from, to: node.to, kind: 'mark', group: { from: parent.from, to: parent.to } })
      } else if (name === 'HardBreak' && doc.sliceString(node.from, node.from + 1) === '\\') {
        found.push({ from: node.from, to: node.from + 1, kind: 'mark', group: { from: node.from, to: node.from + 1 } })
      } else if (name === 'Link') {
        const marks: { from: number; to: number }[] = []
        let hasAddress = false
        for (let child = node.node.firstChild; child; child = child.nextSibling) {
          if (child.name === 'LinkMark') marks.push({ from: child.from, to: child.to })
          if (child.name === 'URL') hasAddress = true
        }
        const [open, close] = marks
        // Reference-style links name their address elsewhere: kept as written.
        if (hasAddress && open && close) {
          const group = { from: node.from, to: node.to }
          found.push(
            { from: open.from, to: open.to, kind: 'link-open', group },
            { from: close.from, to: node.to, kind: 'link-close', group },
          )
        }
      }
      return undefined
    },
  })

  for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) {
    const line = doc.line(n)
    for (const span of findSpans(line.text, line.from)) {
      const group = { from: span.from, to: span.to }
      found.push({ from: span.from, to: span.contentFrom, kind: 'mark', group }, { from: span.contentTo, to: span.to, kind: 'mark', group })
    }
    found.push(...wikilinks(line.text, line.from))
  }
  return found
}

/** `[[bea]]` is drawn as its name and stays whole: its words are the file it points to. `[[bea|Aunt Bea]]` shows its label. */
export function wikilinks(text: string, offset: number): Hidden[] {
  const code = [...text.matchAll(CODE)].map((m) => [m.index, m.index + m[0].length] as const)
  const found: Hidden[] = []
  for (const match of text.matchAll(WIKI)) {
    if (code.some(([a, b]) => match.index >= a && match.index < b)) continue
    const from = offset + match.index
    const to = from + match[0].length
    const group = { from, to }
    const label = match[2]
    if (label === undefined || label.trim() === '') {
      found.push({ from, to, kind: 'whole', group, shows: (match[1] ?? '').trim() })
    } else {
      found.push({ from, to: to - 2 - label.length, kind: 'link-open', group }, { from: to - 2, to, kind: 'link-close', group })
    }
  }
  return found
}

const invisible = (h: Hidden): boolean => h.kind === 'mark' || h.kind === 'link-open' || h.kind === 'link-close'

/** Where the line's prefixes end: the first place the cursor may be on the line. */
export function textStart(hidden: readonly Hidden[], lineFrom: number): number {
  let end = lineFrom
  for (const h of hidden) if (h.kind === 'prefix' && h.from === end) end = h.to
  return end
}

/** Invisible ranges that touch, merged: together they sit between two visible characters. */
export interface Cluster {
  from: number
  to: number
  members: Hidden[]
}

export function clusters(hidden: readonly Hidden[]): Cluster[] {
  const result: Cluster[] = []
  for (const h of hidden.filter(invisible)) {
    const last = result.at(-1)
    if (last && h.from <= last.to) {
      last.to = Math.max(last.to, h.to)
      last.members.push(h)
    } else result.push({ from: h.from, to: h.to, members: [h] })
  }
  return result
}

/**
 * Where the cursor rests at `pos`. Hidden marks have no width: where they sit between two letters, the
 * cursor rests before them, the logically earlier side, so new text takes the formatting before it
 * (Word's rule) in Hebrew and English alike. A link is the exception: at either end the cursor rests
 * outside it, so typing next to a link never makes it longer. Never before a line's prefix.
 */
export function restingPlace(state: EditorState, pos: number): number {
  const line = state.doc.lineAt(pos)
  const hidden = hiddenIn(state, line.from, line.to)
  const start = textStart(hidden, line.from)
  if (pos <= start) return start
  const cluster = clusters(hidden).find((c) => c.from <= pos && pos <= c.to)
  if (!cluster) return pos
  const pending = state.field(pendingFormat, false)
  if (pending && cluster.members.some((m) => m.group.from === pending.from)) return pending.from + pending.marker.length
  let rest = Math.max(cluster.from, start)
  for (const m of cluster.members) if (m.kind === 'link-close' && m.to <= cluster.to) rest = Math.max(rest, m.to)
  return rest
}
