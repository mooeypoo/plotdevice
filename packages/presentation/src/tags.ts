import { projectTags, tagKey, type ProjectTag } from '@plotdevice/shared'

/** The tags on `pages`, A to Z in the interface's language, for the row of tags above a list. */
export function tagRow(pages: readonly { tags: readonly string[] }[], locale: string): ProjectTag[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  return projectTags(pages).sort((a, b) => collator.compare(a.tag, b.tag))
}

/**
 * What "+ Tag" offers while the author types: the project's tags not yet on the page, those starting
 * with what was typed first, then those containing it, the most used first within each.
 */
export function tagSuggestions(tags: readonly ProjectTag[], onPage: readonly string[], typed: string, limit = 8): string[] {
  const present = new Set(onPage.map(tagKey))
  const wanted = tagKey(typed)
  const rank = (tag: ProjectTag): number => {
    const key = tagKey(tag.tag)
    if (wanted === '' || key.startsWith(wanted)) return 0
    return key.includes(wanted) ? 1 : Number.POSITIVE_INFINITY
  }
  return tags
    .filter((tag) => !present.has(tagKey(tag.tag)))
    .map((tag) => ({ tag, rank: rank(tag) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank || b.tag.pages - a.tag.pages)
    .slice(0, limit)
    .map(({ tag }) => tag.tag)
}

export interface TagGroups<T> {
  /** One group per chosen tag that has pages here, in the order the tags were chosen. */
  groups: { tag: string; pages: T[] }[]
  /** Everything not in a group, in its original order. */
  others: T[]
}

/**
 * A list grouped by the chosen tags (Milestone 12, decision 2): each page in the first group it
 * belongs to, the rest after. With no tag chosen, everything is in `others`. Order within a group is
 * the list's own, so search results stay best first.
 */
export function groupByTags<T extends { tags: readonly string[] }>(pages: readonly T[], chosen: readonly string[]): TagGroups<T> {
  const keys = chosen.map(tagKey)
  const groups = chosen.map((tag) => ({ tag, pages: [] as T[] }))
  const others: T[] = []
  for (const page of pages) {
    const own = new Set(page.tags.map(tagKey))
    const at = keys.findIndex((key) => own.has(key))
    if (at === -1) others.push(page)
    else groups[at]?.pages.push(page)
  }
  return { groups: groups.filter((group) => group.pages.length > 0), others }
}
