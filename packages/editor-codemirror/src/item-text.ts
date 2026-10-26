/**
 * Reading a card's one line of text for its editor: where its links are, so they show as names, and
 * whether the author is typing the name of something to link (`@Bea`, or `[[Bea` as in Obsidian).
 * Pure functions of the text, so they are tested without an editor.
 */

const CODE = /`[^`\n]*`/g
const LINK = /(?<!!)\[((?:\\.|[^\]\\\n])*)\]\((?:<[^<>\n]*>|[^\s()<]+)(?:[ \t]+"[^"\n]*")?\)/g
const WIKI = /\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g

export interface LinkRange {
  from: number
  to: number
  /** What the link shows: its text, or a wikilink's alias or name. */
  label: string
}

export function linkRanges(text: string): LinkRange[] {
  const code = [...text.matchAll(CODE)].map((match) => [match.index, match.index + match[0].length] as const)
  const inCode = (at: number): boolean => code.some(([from, to]) => at >= from && at < to)
  const links: LinkRange[] = []
  for (const match of text.matchAll(WIKI))
    links.push({ from: match.index, to: match.index + match[0].length, label: (match[2] ?? match[1] ?? '').trim() })
  for (const match of text.matchAll(LINK)) {
    if (links.some((link) => match.index >= link.from && match.index < link.to)) continue
    links.push({ from: match.index, to: match.index + match[0].length, label: (match[1] ?? '').replace(/\\([[\]\\])/g, '$1') })
  }
  return links.filter((link) => !inCode(link.from)).sort((a, b) => a.from - b.from)
}

/** Long enough for any name; a longer run after `@` is a sentence, not a name being typed. */
const LONGEST = 40

/**
 * The name being typed for a link, ending at `cursor`: after an `@` at the start or after a space or
 * opening punctuation (so `ilka@marrow` is left alone), or after `[[`. `from` is where the `@` or `[[`
 * is, so choosing a page replaces the whole of it. `null` when no link name is being typed.
 */
export function linkQueryAt(text: string, cursor: number): { from: number; text: string } | null {
  const before = text.slice(0, cursor)
  const done = linkRanges(before).at(-1)?.to ?? 0
  const at = before.lastIndexOf('@')
  const brackets = before.lastIndexOf('[[')
  const start = Math.max(at, brackets)
  if (start < done || start === -1) return null
  const marker = start === brackets ? 2 : 1
  if (marker === 1 && start > 0 && !/[\s([{"'“‘«]/u.test(before[start - 1] ?? '')) return null
  const query = before.slice(start + marker)
  if (query.length > LONGEST || /[\]\n,.;:!?]/.test(query)) return null
  return { from: start, text: query }
}
