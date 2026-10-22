import type { LinkAt } from '../../shared/link-at'
import { findWikiLinks } from '../../shared/wiki-link-scan'
import { withoutCode } from './cast-members'

const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/u
const HEADING_MARKER = /^\s*#{1,6}\s+/u
const MARKDOWN_LINK = /!?\[[^\]\n]*\]\(([^)\s]+)\)/gu

/** A line shown as text: list and heading markers dropped, each wikilink as its shown text. */
function readable(line: string): string {
  const stripped = line.replace(LIST_MARKER, '').replace(HEADING_MARKER, '')
  let shown = ''
  let from = 0
  for (const link of findWikiLinks(stripped)) {
    const label = stripped.slice(link.labelFrom, link.labelTo).trim()
    shown += stripped.slice(from, link.from) + (label === '' ? link.target : label)
    from = link.to
  }
  return (shown + stripped.slice(from)).trim()
}

/** The outline's lines that link to a chapter, as readable text, in outline order. */
export function outlineLinesFor(outline: string, pointsHere: (link: LinkAt) => boolean): string[] {
  return withoutCode(outline)
    .split(/\r?\n/u)
    .filter((line) => {
      const links: LinkAt[] = [
        ...findWikiLinks(line).map((link): LinkAt => ({ kind: 'wiki', target: link.target })),
        ...[...line.matchAll(MARKDOWN_LINK)].flatMap((match): LinkAt[] =>
          match[1] === undefined ? [] : [{ kind: 'markdown', address: match[1] }]
        )
      ]
      return links.some(pointsHere)
    })
    .map(readable)
}
