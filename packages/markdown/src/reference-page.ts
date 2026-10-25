import type { Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { formatScalar, readFrontmatter, splitFrontmatter } from './frontmatter'

/** A character, place or note page, read leniently: pages written in any app work as they are. */
export interface ReferencePage {
  title: string
  /** Other names, for search (`aka` in frontmatter: a list or a single name). */
  aka: string[]
  /** The first paragraph, as written; `null` when the page has none. */
  description: string | null
  /** Everything after the description, as written. */
  details: string
  /** The frontmatter couldn't be read; the page is still shown, and never rewritten to fix it. */
  invalidDetails: boolean
}

/**
 * Reads a page: the title from frontmatter, else the first `#` heading, else `fileStem`; the first
 * paragraph is the description and the rest the details. Nothing here changes the text.
 */
export function readReferencePage(text: string, fileStem: string): ReferencePage {
  const { frontmatter, body } = splitFrontmatter(text)
  const values = readFrontmatter(text)
  const fields = values.ok ? values.value : {}
  const blocks = (fromMarkdown(body) as Root).children
  const end = (index: number): number => blocks[index]?.position?.end.offset ?? 0

  let next = 0
  let headingTitle: string | null = null
  const first = blocks[0]
  if (first?.type === 'heading' && first.depth === 1) {
    headingTitle = body.slice(first.position?.start.offset ?? 0, end(0)).replace(/^ {0,3}#[ \t]*|[ \t]+#+[ \t]*$/g, '').trim()
    next = 1
  }
  const paragraph = blocks[next]
  const description = paragraph?.type === 'paragraph' ? body.slice(paragraph.position?.start.offset ?? 0, end(next)) : null
  const detailsStart = description !== null ? end(next) : next > 0 ? end(0) : 0

  return {
    title: nonEmpty(fields.title) ?? (headingTitle || null) ?? fileStem,
    aka: names(fields.aka),
    description,
    details: body.slice(detailsStart).replace(/^(?:[ \t]*\r?\n)+/, ''),
    invalidDetails: frontmatter !== null && !values.ok,
  }
}

const nonEmpty = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)

function names(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value]
  return list.flatMap((entry) => {
    const name = nonEmpty(typeof entry === 'number' ? String(entry) : entry)
    return name ? [name] : []
  })
}

/** A new page: just its title (Milestone 5, decision 1). */
export function newReferencePage(title: string): string {
  return `---\ntitle: ${formatScalar(title)}\n---\n`
}
