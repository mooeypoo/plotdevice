import { findWikiLinks } from '../editor/wiki-link-scan'
import { linkAt, type LinkAt } from '../editor/link-at'

/**
 * The lines (1-based) of an outline that link to the open entry, by wikilink or markdown link.
 * `pointsHere` decides whether a link means the open entry.
 */
export function linesLinkingHere(text: string, pointsHere: (link: LinkAt) => boolean): number[] {
  const lines: number[] = []
  for (const [index, line] of text.split('\n').entries()) {
    const wiki = findWikiLinks(line).some((link) =>
      pointsHere({ kind: 'wiki', target: link.target })
    )
    const markdown = [...line.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)\)/gu)].some((match) => {
      const found = linkAt(line, 0, match.index)
      return found?.kind === 'markdown' && pointsHere(found)
    })
    if (wiki || markdown) lines.push(index + 1)
  }
  return lines
}
