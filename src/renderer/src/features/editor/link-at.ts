import { findWikiLinks } from './wiki-link-scan'

/** The link at a position: a wikilink's target, or a markdown link's address. */
export type LinkAt =
  | { readonly kind: 'wiki'; readonly target: string }
  | { readonly kind: 'markdown'; readonly address: string }

const MARKDOWN_LINK = /!?\[[^\]\n]*\]\(([^)\s]+)\)/gu

/** The link covering `position` in a line that starts at `lineFrom`, if any. */
export function linkAt(lineText: string, lineFrom: number, position: number): LinkAt | undefined {
  const wiki = findWikiLinks(lineText, lineFrom).find(
    (link) => position >= link.from && position <= link.to
  )
  if (wiki !== undefined) return { kind: 'wiki', target: wiki.target }
  for (const match of lineText.matchAll(MARKDOWN_LINK)) {
    const from = lineFrom + match.index
    if (position >= from && position <= from + match[0].length && match[1] !== undefined) {
      return { kind: 'markdown', address: match[1] }
    }
  }
  return undefined
}
