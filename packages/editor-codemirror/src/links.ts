import type { EditorState, TransactionSpec } from '@codemirror/state'
import { linkDestination } from './format'
import { hiddenIn } from './hidden'

/**
 * The link the cursor is in, for the link popup (Milestone 16): where it goes, and changing or removing
 * it. Its words are edited like any words; these change only what is hidden around them.
 */
export interface LinkPlace {
  /** The whole link, marks and all. */
  from: number
  to: number
  /** Its words. */
  wordsFrom: number
  wordsTo: number
  /** Where it goes, as written: a relative path, a web address, or a wikilink's page name. */
  target: string
}

/** `](target "title")` or `](<target with spaces>)`: the target, as written. */
function targetOf(close: string): string {
  const inner = close.replace(/^\]\(/, '').replace(/\)$/, '').trim()
  const angled = /^<([^<>\n]*)>/.exec(inner)
  if (angled) return angled[1] ?? ''
  return inner.split(/[ \t]+/)[0] ?? ''
}

/**
 * The link the cursor is in or right beside (where it rests at either end), or whose words hold the
 * selection `from`–`to`; `null` when there is none.
 */
export function linkAt(state: EditorState, from: number, to = from): LinkPlace | null {
  const hidden = hiddenIn(state, from, to)
  for (const open of hidden) {
    if (open.kind !== 'link-open') continue
    const close = hidden.find((h) => h.kind === 'link-close' && h.group.from === open.group.from)
    if (!close) continue
    const inside = from === to ? open.from <= from && from <= close.to : open.to <= from && to <= close.from
    if (!inside) continue
    const raw = state.sliceDoc(close.from, close.to)
    const wiki = raw === ']]'
    const target = wiki ? (state.sliceDoc(open.from + 2, open.to - 1).split('#')[0] ?? '').trim() : targetOf(raw)
    return { from: open.from, to: close.to, wordsFrom: open.to, wordsTo: close.from, target }
  }
  return null
}

/** Points the link somewhere else and keeps its words. A wikilink becomes an ordinary link, the kind the app writes. */
export function changeLink(state: EditorState, link: LinkPlace, target: string): TransactionSpec {
  const words = state.sliceDoc(link.wordsFrom, link.wordsTo)
  return {
    changes: { from: link.from, to: link.to, insert: `[${words}](${linkDestination(target)})` },
    filter: false,
    userEvent: 'input.link',
  }
}

/** Removes the link and keeps its words as plain text. */
export function removeLink(state: EditorState, link: LinkPlace): TransactionSpec {
  return {
    changes: [
      { from: link.from, to: link.wordsFrom },
      { from: link.wordsTo, to: link.to },
    ],
    filter: false,
    userEvent: 'input.link',
  }
}
