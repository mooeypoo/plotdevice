import { parseWikiLink, type WikiLink } from './wiki-link'

/** A frontmatter value that should be a wikilink, as read. */
export type LinkValue =
  | { readonly kind: 'link'; readonly link: WikiLink; readonly recovered?: true }
  | { readonly kind: 'missing' }
  | { readonly kind: 'invalid' }

/**
 * Reads a frontmatter value that should hold one wikilink. An unquoted `[[Name]]`, which YAML reads
 * as a list inside a list, is recovered (see "Values with a different shape" in docs/file-format.md).
 */
export function readLinkValue(value: unknown): LinkValue {
  if (value === undefined || value === null) return { kind: 'missing' }
  if (typeof value === 'string') {
    const parsed = parseWikiLink(value)
    return parsed.ok ? { kind: 'link', link: parsed.value } : { kind: 'invalid' }
  }
  const inner = unquotedLinkText(value)
  if (inner !== undefined) {
    const parsed = parseWikiLink(`[[${inner}]]`)
    if (parsed.ok) return { kind: 'link', link: parsed.value, recovered: true }
  }
  return { kind: 'invalid' }
}

/** Reads a value that may be a list of links or a single link; invalid items are counted, not kept. */
export function readLinkList(value: unknown): {
  readonly links: readonly WikiLink[]
  readonly invalidCount: number
} {
  if (value === undefined || value === null) return { links: [], invalidCount: 0 }
  const items = Array.isArray(value) && unquotedLinkText(value) === undefined ? value : [value]
  const links: WikiLink[] = []
  let invalidCount = 0
  for (const item of items) {
    const read = readLinkValue(item)
    if (read.kind === 'link') links.push(read.link)
    else invalidCount += 1
  }
  return { links, invalidCount }
}

/** `[["Name"]]` (YAML's reading of an unquoted `[[Name]]`) → `"Name"`. */
function unquotedLinkText(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 1) return undefined
  const inner: unknown = value[0]
  if (!Array.isArray(inner) || inner.length !== 1) return undefined
  const text: unknown = inner[0]
  return typeof text === 'string' ? text : undefined
}
