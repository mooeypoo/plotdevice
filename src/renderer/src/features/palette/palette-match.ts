/** How well an item matches: lower is better; `undefined` means no match. */
export type MatchRank = 0 | 1 | 2 | 3

/** Something the palette can match: its title and any other names (aliases). */
export interface Matchable {
  readonly title: string
  readonly aliases?: readonly string[]
}

/**
 * Compares text the way a writer reads it: case, accents and niqqud don't matter. Uses the UI
 * locale's collation at base strength, character by character.
 */
export function createMatcher(locale: string) {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', usage: 'search' })
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' })
  const letters = (text: string): string[] =>
    Array.from(segmenter.segment(text), (part) => part.segment)
  const same = (a: string, b: string): boolean => collator.compare(a, b) === 0

  /** Where `query` starts in `text`, comparing letter by letter, or -1. */
  function indexOf(text: readonly string[], query: readonly string[]): number {
    for (let start = 0; start + query.length <= text.length; start += 1) {
      if (query.every((letter, offset) => same(text[start + offset] ?? '', letter))) return start
    }
    return -1
  }

  function isSubsequence(text: readonly string[], query: readonly string[]): boolean {
    let at = 0
    for (const letter of text) {
      if (at < query.length && same(letter, query[at] ?? '')) at += 1
    }
    return at === query.length
  }

  /** Prefix (0), word start (1), anywhere (2), letters in order (3), or no match. */
  function rankName(name: string, query: string): MatchRank | undefined {
    const text = letters(name)
    const wanted = letters(query.trim())
    if (wanted.length === 0) return 0
    const at = indexOf(text, wanted)
    if (at === 0) return 0
    if (at > 0) return /[\s\-–—_/:(]/u.test(text[at - 1] ?? '') ? 1 : 2
    return isSubsequence(text, wanted) ? 3 : undefined
  }

  /** The best rank over an item's title and aliases. */
  function rank(item: Matchable, query: string): MatchRank | undefined {
    const ranks = [item.title, ...(item.aliases ?? [])]
      .map((name) => rankName(name, query))
      .filter((value): value is MatchRank => value !== undefined)
    return ranks.length === 0 ? undefined : (Math.min(...ranks) as MatchRank)
  }

  /** Matching items, best first; ties keep the order they were given in. */
  function filter<T extends Matchable>(items: readonly T[], query: string): T[] {
    return items
      .map((item, index) => ({ item, index, rank: rank(item, query) }))
      .filter(
        (entry): entry is { item: T; index: number; rank: MatchRank } => entry.rank !== undefined
      )
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((entry) => entry.item)
  }

  return { rank, filter, compare: collator.compare.bind(collator) }
}
