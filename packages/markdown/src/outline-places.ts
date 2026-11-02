import type { ItemPath, OutlineItemSource, ParsedOutline, TextRange } from './outline-model'

/**
 * Places in an outline's text, for the Text view (Milestone 14): which card or detail the cursor is
 * on, where a card's line is, and what the board will show "kept as written". Pure reads of a parse.
 */

/** The deepest card or detail whose lines hold `offset`; `null` on a heading, an intro or a blank line between lists. */
export function itemAt(outline: ParsedOutline, offset: number): ItemPath | null {
  const holds = (item: OutlineItemSource): boolean =>
    item.lineRange.start <= offset && (offset < item.lineRange.end || (offset === item.lineRange.end && offset === outline.source.length))
  for (const [section, { items }] of outline.sections.entries()) {
    const path: number[] = []
    let level: readonly OutlineItemSource[] = items
    for (;;) {
      const index = level.findIndex(holds)
      const found = level[index]
      if (!found) break
      path.push(index)
      level = found.children
    }
    if (path.length > 0) return { section, path }
  }
  return null
}

/** Where the text of a card or detail starts, after its bullet; `null` when there is no such item. */
export function itemStart(outline: ParsedOutline, at: ItemPath): number | null {
  let level: readonly OutlineItemSource[] = outline.sections[at.section]?.items ?? []
  let item: OutlineItemSource | undefined
  for (const index of at.path) {
    item = level[index]
    if (!item) return null
    level = item.children
  }
  return item?.textRange.start ?? null
}

/**
 * What the board and list show "kept as written", in the order it is written: everything the outline
 * views don't edit, except `###` headings, which show as group labels.
 */
export function keptPassages(outline: ParsedOutline): TextRange[] {
  const ranges: TextRange[] = outline.preamble.map((block) => block.range)
  const visit = (items: readonly OutlineItemSource[]): void => {
    for (const item of items) {
      ranges.push(...item.kept.map((block) => block.range))
      visit(item.children)
    }
  }
  for (const section of outline.sections) {
    ranges.push(...section.kept.filter((block) => block.reason !== 'subheading').map((block) => block.range))
    visit(section.items)
  }
  return ranges.sort((a, b) => a.start - b.start)
}
