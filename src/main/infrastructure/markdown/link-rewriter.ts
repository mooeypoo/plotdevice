import { parseWikiLink, type WikiLink } from '../../shared-kernel/wiki-link'
import { codeRanges, insideAny } from './code-ranges'

const WIKILINK = /!?\[\[[^[\]\n]+\]\]/gu

/** What to do with one link: return the new link text, or `undefined` to leave it as it is. */
export type LinkDecision = (link: WikiLink, raw: string) => string | undefined

/** Text with some links replaced, and how many were. */
export interface RewrittenText {
  readonly text: string
  readonly count: number
}

/**
 * Rewrites wikilinks in text, changing only the characters of the links `decide` replaces.
 * Links inside code (fenced blocks, inline code) are left alone when `skipCode` is set.
 */
export function rewriteWikiLinks(
  text: string,
  decide: LinkDecision,
  options: { readonly skipCode: boolean }
): RewrittenText {
  const code = options.skipCode ? codeRanges(text) : []
  let result = ''
  let last = 0
  let count = 0
  for (const match of text.matchAll(WIKILINK)) {
    if (insideAny(code, match.index)) continue
    const parsed = parseWikiLink(match[0])
    if (!parsed.ok) continue
    const replacement = decide(parsed.value, match[0])
    if (replacement === undefined || replacement === match[0]) continue
    result += text.slice(last, match.index) + replacement
    last = match.index + match[0].length
    count += 1
  }
  return { text: count === 0 ? text : result + text.slice(last), count }
}

/** Every wikilink in text, outside code when `skipCode` is set. */
export function findWikiLinks(text: string, options: { readonly skipCode: boolean }): WikiLink[] {
  const found: WikiLink[] = []
  rewriteWikiLinks(
    text,
    (link) => {
      found.push(link)
      return undefined
    },
    options
  )
  return found
}
