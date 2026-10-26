import type { Heading, List, ListItem, Nodes, Root, RootContent } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { err, ok, type Result } from '@plotdevice/shared'
import { splitFrontmatter } from './frontmatter'
import { findLinks, type FoundLink } from './links'
import type { TextRange } from './outline-model'
import { lineEndAt, lineEndingOf, lineStartAt } from './text'

/** One relationship: a top-level bullet under the page's relationships heading that has a link (ADR 0009). */
export interface RelationshipSource {
  /** The bullet's words as written, without its marker: `Sister of [Bea](bea.md)`. */
  text: string
  links: FoundLink[]
}

export interface PageRelationships {
  /** The section, from its heading to just before the next heading of the same or a higher level. */
  section: TextRange | null
  relationships: RelationshipSource[]
}

/** `heading`: the name to give the section when the page has none yet, in the project's language. */
export type RelationshipEdit =
  { kind: 'add'; text: string; heading: string } | { kind: 'change'; index: number; text: string } | { kind: 'remove'; index: number }

export type RelationshipEditProblem = 'empty-text' | 'multiline-text' | 'missing'

interface Bullet {
  item: ListItem
  /** The bullet's own words (its first paragraph), in the whole text. */
  words: TextRange
  source: RelationshipSource
}

interface Found {
  heading: Heading
  section: TextRange
  /** Every top-level bullet in the section, in order, linked or not. */
  bullets: Bullet[]
}

const at = (node: Nodes, base: number): TextRange => ({
  start: base + (node.position?.start.offset ?? 0),
  end: base + (node.position?.end.offset ?? 0),
})

/** "Relationships", "RELATIONSHIPS:" and "relationships" are the same name. */
const nameKey = (name: string): string =>
  name
    .normalize('NFC')
    .trim()
    .replace(/[:：]$/, '')
    .trim()
    .toLocaleLowerCase()

/** The heading's words, without its `#` marks or a setext underline. */
function headingText(text: string, range: TextRange): string {
  const firstLine = text.slice(range.start, range.end).split(/\r?\n/)[0] ?? ''
  return firstLine.replace(/^ {0,3}#+[ \t]*|[ \t]+#+[ \t]*$/g, '').trim()
}

function find(text: string, fileDir: string, headings: readonly string[]): { found: Found | null; blocks: RootContent[]; base: number } {
  const { body } = splitFrontmatter(text)
  const base = text.length - body.length
  const blocks = (fromMarkdown(body) as Root).children
  const names = new Set(headings.map(nameKey))
  const start = blocks.findIndex((block) => block.type === 'heading' && names.has(nameKey(headingText(text, at(block, base)))))
  const heading = blocks[start]
  if (heading?.type !== 'heading') return { found: null, blocks, base }

  const inside: RootContent[] = []
  for (const block of blocks.slice(start + 1)) {
    if (block.type === 'heading' && block.depth <= heading.depth) break
    inside.push(block)
  }
  const bullets = inside
    .filter((block): block is List => block.type === 'list')
    .flatMap((list) => list.children)
    .flatMap((item): Bullet[] => {
      const first = item.children[0]
      if (first?.type !== 'paragraph') return []
      const words = at(first, base)
      const wordsText = text.slice(words.start, words.end)
      return [{ item, words, source: { text: wordsText, links: findLinks(wordsText, fileDir) } }]
    })
  const last = inside.at(-1) ?? heading
  return { found: { heading, section: { start: at(heading, base).start, end: at(last, base).end }, bullets }, blocks, base }
}

/**
 * The relationships on a page: the top-level bullets with a link under a heading named one of
 * `headings` (in any language the app speaks). Bullets without a link are left as they are. Links
 * resolve from `fileDir`, as in `findLinks`.
 */
export function readRelationships(text: string, fileDir: string, headings: readonly string[]): PageRelationships {
  const { found } = find(text, fileDir, headings)
  if (!found) return { section: null, relationships: [] }
  return { section: found.section, relationships: found.bullets.filter((bullet) => bullet.source.links.length > 0).map((b) => b.source) }
}

/**
 * Adds, changes or removes one relationship, touching only that bullet; the first one also adds the
 * heading, after the description (ADR 0009). The rest of the page stays byte for byte.
 */
export function editRelationships(
  text: string,
  fileDir: string,
  headings: readonly string[],
  edit: RelationshipEdit,
): Result<string, RelationshipEditProblem> {
  // The same bullets as `readRelationships` counts, so an index means the same relationship.
  const { found, blocks, base } = find(text, fileDir, headings)
  const relationships = found?.bullets.filter((bullet) => bullet.source.links.length > 0) ?? []
  const eol = lineEndingOf(text)

  if (edit.kind === 'remove') {
    const bullet = relationships[edit.index]
    if (!bullet) return err('missing')
    const range = at(bullet.item, 0)
    const before = text.slice(0, lineStartAt(text, range.start + base))
    let after = text.slice(lineEndAt(text, range.end + base))
    // The last bullet between two blank lines: keep one blank line, not two.
    if (/(?:^|\n)[ \t]*\r?\n$/.test(before) && /^[ \t]*\r?\n/.test(after)) after = after.replace(/^[ \t]*\r?\n/, '')
    return ok(before + after)
  }

  const words = edit.text.trim()
  if (words === '') return err('empty-text')
  if (/[\r\n]/.test(words)) return err('multiline-text')

  if (edit.kind === 'change') {
    const bullet = relationships[edit.index]
    if (!bullet) return err('missing')
    return ok(text.slice(0, bullet.words.start) + words + text.slice(bullet.words.end))
  }

  if (found) {
    const last = found.bullets.at(-1)
    if (last) {
      // After the last bullet, as its sibling: the same indentation and marker.
      const item = at(last.item, base)
      const lineStart = lineStartAt(text, item.start)
      const indent = /^[ \t]*/.exec(text.slice(lineStart, item.start))?.[0] ?? ''
      const marker = /^[-*+]/.exec(text.slice(item.start))?.[0] ?? '-'
      return ok(insert(text, item.end, `${eol}${indent}${marker} ${words}`))
    }
    // An empty section: the list goes right under its heading.
    return ok(insert(text, at(found.heading, base).end, `${eol}${eol}- ${words}`, eol))
  }

  const section = `## ${edit.heading.trim()}${eol}${eol}- ${words}`
  const first = blocks[0]?.type === 'heading' && blocks[0].depth === 1 ? 1 : 0
  const description = blocks[first]
  if (description?.type === 'paragraph') return ok(insert(text, at(description, base).end, `${eol}${eol}${section}`, eol))
  const body = text.slice(base)
  const ended = text === '' || /\r?\n$/.test(text) ? text : `${text}${eol}`
  return ok(`${ended}${body.trim() === '' ? '' : eol}${section}${eol}`)
}

/** Inserts `addition` at `offset`; when a line of text follows directly, a blank line keeps it apart. */
function insert(text: string, offset: number, addition: string, eol?: string): string {
  const rest = text.slice(offset)
  const joinsNext = eol !== undefined && /^\r?\n[ \t]*\S/.test(rest)
  return text.slice(0, offset) + addition + (joinsNext ? eol : '') + rest
}
