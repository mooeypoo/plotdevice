/**
 * Tags are written as the author says them (Milestone 12, decision 1). Two spellings are the same tag
 * when they differ only in case or spacing: "Marrow folk" and "marrow  Folk".
 */
export function tagKey(tag: string): string {
  return tidy(tag).toLowerCase()
}

const tidy = (tag: string): string => tag.normalize('NFC').trim().replace(/\s+/g, ' ')

/** A page's tags as the app writes them: tidied, blanks dropped, each tag once (its first spelling). */
export function cleanTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  return tags.map(tidy).filter((tag) => {
    const key = tag.toLowerCase()
    if (tag === '' || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** A tag in the project, shown with the first spelling found, and how many pages have it. */
export interface ProjectTag {
  tag: string
  pages: number
}

/** Every tag on `pages`, in the order first found. Pages should come in a stable order (by file). */
export function projectTags(pages: readonly { tags: readonly string[] }[]): ProjectTag[] {
  const found = new Map<string, ProjectTag>()
  for (const page of pages)
    for (const tag of cleanTags(page.tags)) {
      const known = found.get(tagKey(tag))
      if (known) known.pages++
      else found.set(tagKey(tag), { tag, pages: 1 })
    }
  return [...found.values()]
}

/** Two tags that are probably one, the more used first: the author may want to merge them. */
export interface NearDuplicate {
  tags: [ProjectTag, ProjectTag]
  /** The same for the same pair, however they are spelled, so a reported pair is recognised later. */
  key: string
}

/**
 * Tags that match once spaces, dashes and punctuation are ignored ("Part Two – main", "part two main"),
 * or differ by a letter in a tag of five letters or more, two in one of ten or more ("Varga famliy").
 * "Part 2" and "Part Two" aren't found: that would need number words in every language.
 */
export function nearDuplicateTags(tags: readonly ProjectTag[]): NearDuplicate[] {
  const letters = tags.map((tag) => ({ tag, letters: tagKey(tag.tag).replace(/[^\p{L}\p{N}]/gu, '') }))
  const found: NearDuplicate[] = []
  for (const [i, a] of letters.entries())
    for (const b of letters.slice(i + 1)) {
      const shorter = Math.min(a.letters.length, b.letters.length)
      const allowed = shorter >= 10 ? 2 : shorter >= 5 ? 1 : 0
      if (shorter === 0 || editDistance(a.letters, b.letters, allowed) > allowed) continue
      const pair: [ProjectTag, ProjectTag] = b.tag.pages > a.tag.pages ? [b.tag, a.tag] : [a.tag, b.tag]
      found.push({ tags: pair, key: [a.letters, b.letters].sort().join('\u0000') })
    }
  return found
}

/** Levenshtein distance, giving up (returning `limit + 1`) once it is past `limit`. */
function editDistance(a: string, b: string, limit: number): number {
  const x = [...a]
  const y = [...b]
  if (Math.abs(x.length - y.length) > limit) return limit + 1
  let previous = Array.from({ length: y.length + 1 }, (_, j) => j)
  for (let i = 1; i <= x.length; i++) {
    const row = [i]
    for (let j = 1; j <= y.length; j++)
      row[j] = Math.min((previous[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + (x[i - 1] === y[j - 1] ? 0 : 1))
    if (Math.min(...row) > limit) return limit + 1
    previous = row
  }
  return previous[y.length] ?? limit + 1
}
