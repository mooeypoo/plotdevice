import type { OutlineItemView, OutlineView } from '@plotdevice/contracts'

/** An item: its section, then the index at each level from the card down. */
export interface ItemAt {
  section: number
  path: number[]
}

/** Where a moved item goes; `index` counts the siblings without it (as the outline edit expects). */
export interface ItemDestination {
  section: number
  parentPath: number[]
  index: number
}

export type BoardEntry =
  { kind: 'card'; item: OutlineItemView; path: ItemAt; detailCount: number } | { kind: 'group' | 'kept'; text: string }

export interface BoardColumn {
  /** `null` for cards before the first section. */
  name: string | null
  intro: string[]
  entries: BoardEntry[]
}

const countDetails = (item: OutlineItemView): number => item.children.reduce((sum, child) => sum + 1 + countDetails(child), 0)

/** Board: a column per section, with `###` group labels and kept-as-written tiles where they sit among the cards. */
export function boardColumns(outline: OutlineView): BoardColumn[] {
  return outline.sections.map((section, sectionIndex) => {
    const entries: BoardEntry[] = []
    const notesBefore = (index: number) =>
      section.notes.filter((note) => note.before === index).map((note): BoardEntry => ({ kind: note.kind, text: note.text }))
    section.items.forEach((item, index) => {
      entries.push(...notesBefore(index), {
        kind: 'card',
        item,
        path: { section: sectionIndex, path: [index] },
        detailCount: countDetails(item),
      })
    })
    entries.push(
      ...section.notes
        .filter((note) => note.before >= section.items.length)
        .map((note): BoardEntry => ({ kind: note.kind, text: note.text })),
    )
    return { name: section.name, intro: section.intro, entries }
  })
}

export interface OutlineRow {
  /** `section/index/index…`: stable while the outline doesn't change, for collapsing and focus. */
  key: string
  item: OutlineItemView
  path: ItemAt
  depth: number
  hasChildren: boolean
  collapsed: boolean
}

export const keyOf = (at: ItemAt): string => [at.section, ...at.path].join('/')

/** Outline: every item in order with its depth; what is inside a collapsed item is left out. */
export function outlineRows(outline: OutlineView, collapsed: ReadonlySet<string>): OutlineRow[] {
  const rows: OutlineRow[] = []
  const visit = (items: OutlineItemView[], section: number, prefix: number[]): void => {
    items.forEach((item, index) => {
      const path = { section, path: [...prefix, index] }
      const key = keyOf(path)
      const isCollapsed = collapsed.has(key)
      rows.push({ key, item, path, depth: prefix.length, hasChildren: item.children.length > 0, collapsed: isCollapsed })
      if (!isCollapsed) visit(item.children, section, path.path)
    })
  }
  outline.sections.forEach((section, index) => visit(section.items, index, []))
  return rows
}

/**
 * List: the row a new line being typed at `to` follows, or `null` at the start of its section. It sits
 * after everything shown inside the sibling before it, or right under its parent.
 */
export function newLineAfter(rows: readonly OutlineRow[], to: ItemDestination): string | null {
  const before = to.index > 0 ? keyOf({ section: to.section, path: [...to.parentPath, to.index - 1] }) : null
  if (before === null) return to.parentPath.length === 0 ? null : keyOf({ section: to.section, path: to.parentPath })
  const inside = rows.filter((row) => row.key === before || row.key.startsWith(`${before}/`))
  return inside.at(-1)?.key ?? before
}

/** Tab on a new line: it becomes the last detail of the item above it. `null` when nothing is above. */
export function indentedLine(outline: OutlineView, to: ItemDestination): ItemDestination | null {
  if (to.index === 0) return null
  const parentPath = [...to.parentPath, to.index - 1]
  const above = itemAt(outline, { section: to.section, path: parentPath })
  return above ? { section: to.section, parentPath, index: above.children.length } : null
}

/** Shift+Tab on a new line: it moves out one level, right after its parent. `null` for a card. */
export function outdentedLine(to: ItemDestination): ItemDestination | null {
  const parent = to.parentPath.at(-1)
  return parent === undefined ? null : { section: to.section, parentPath: to.parentPath.slice(0, -1), index: parent + 1 }
}

export interface CardMoves {
  /** One step earlier in reading order; at a section's start, to the end of the section before. */
  earlier: ItemDestination | null
  later: ItemDestination | null
  /** To the end of the neighbouring section (cards only). */
  previousSection: ItemDestination | null
  nextSection: ItemDestination | null
}

const NO_MOVES: CardMoves = { earlier: null, later: null, previousSection: null, nextSection: null }

/**
 * Where the keyboard can move an item. A card moves past one neighbour at a time and crosses into the
 * next section at an edge; a detail moves only among its siblings. A locked item doesn't move.
 */
export function cardMoves(outline: OutlineView, at: ItemAt): CardMoves {
  const section = outline.sections[at.section]
  const item = itemAt(outline, at)
  if (!section || !item?.movable) return NO_MOVES
  const index = at.path.at(-1) ?? 0
  const parentPath = at.path.slice(0, -1)

  if (parentPath.length > 0) {
    const siblings = itemAt(outline, { section: at.section, path: parentPath })?.children ?? []
    return {
      ...NO_MOVES,
      earlier: index > 0 ? { section: at.section, parentPath, index: index - 1 } : null,
      later: index < siblings.length - 1 ? { section: at.section, parentPath, index: index + 1 } : null,
    }
  }

  const before = outline.sections[at.section - 1]
  const after = outline.sections[at.section + 1]
  const end = (target: number) => ({ section: target, parentPath: [], index: outline.sections[target]?.items.length ?? 0 })
  return {
    earlier: index > 0 ? { section: at.section, parentPath: [], index: index - 1 } : before ? end(at.section - 1) : null,
    later:
      index < section.items.length - 1
        ? { section: at.section, parentPath: [], index: index + 1 }
        : after
          ? { section: at.section + 1, parentPath: [], index: 0 }
          : null,
    previousSection: before ? end(at.section - 1) : null,
    nextSection: after ? end(at.section + 1) : null,
  }
}

export function itemAt(outline: OutlineView, at: ItemAt): OutlineItemView | null {
  let items = outline.sections[at.section]?.items ?? []
  let found: OutlineItemView | null = null
  for (const index of at.path) {
    found = items[index] ?? null
    items = found?.children ?? []
  }
  return found
}

export type InlineSpan = { kind: 'text' | 'em' | 'strong' | 'code'; text: string } | { kind: 'link'; text: string; target: string }

// One alternative per kind; the first that matches at a position wins. Wikilinks (`[[…]]`) stay text.
const INLINE =
  /\\([\\`*_[\]()#+\-.!>])|`([^`\n]+)`|(?<!\[)\[([^[\]\n]+)\]\(([^()\s]+)(?:\s+"[^"]*")?\)|\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*|__(?=\S)([^_\n]+?)(?<=\S)__|\*(?=\S)([^*\n]+?)(?<=\S)\*|(?<![\p{L}\p{N}])_(?=\S)([^_\n]+?)(?<=\S)_(?![\p{L}\p{N}])/gu

/**
 * A card's text as spans to show formatted: bold, italic, links and code. Everything else, HTML
 * included, stays plain text; the interface never renders it as markup.
 */
export function inlineSpans(markdown: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  const text = (value: string): void => {
    const last = spans.at(-1)
    if (last?.kind === 'text') last.text += value
    else if (value) spans.push({ kind: 'text', text: value })
  }
  let at = 0
  for (const match of markdown.matchAll(INLINE)) {
    text(markdown.slice(at, match.index))
    const [whole, escaped, code, linkText, target, strong, strongUnderscore, em, emUnderscore] = match
    if (escaped !== undefined) text(escaped)
    else if (code !== undefined) spans.push({ kind: 'code', text: code })
    else if (linkText !== undefined && target !== undefined) spans.push({ kind: 'link', text: linkText, target })
    else if ((strong ?? strongUnderscore) !== undefined) spans.push({ kind: 'strong', text: strong ?? strongUnderscore ?? '' })
    else if ((em ?? emUnderscore) !== undefined) spans.push({ kind: 'em', text: em ?? emUnderscore ?? '' })
    else text(whole)
    at = match.index + whole.length
  }
  text(markdown.slice(at))
  return spans
}

/**
 * Where a card dropped before the card at `before` in `section` goes (`before` counts the cards as they
 * are, so the section's length means its end). `null` when the drop would leave it where it is.
 */
export function boardDrop(from: ItemAt, section: number, before: number): ItemDestination | null {
  const sameList = from.path.length === 1 && from.section === section
  const current = from.path[0] ?? 0
  const index = sameList && current < before ? before - 1 : before
  return sameList && index === current ? null : { section, parentPath: [], index }
}
