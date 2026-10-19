import { isDeepStrictEqual } from 'node:util'
import { isMap, isScalar, parseDocument } from 'yaml'
import type { WikiLink } from '../../shared-kernel/wiki-link'
import { splitHead } from './frontmatter-editor'
import { rewriteWikiLinks } from '../../shared-kernel/link-rewriter'

/** Decides a link's replacement, knowing which top-level key it's under. */
export type KeyedLinkDecision = (link: WikiLink, key: string) => string | undefined

/** The rewritten head, or why it was left alone. */
export type FrontmatterLinkRewrite =
  | { readonly kind: 'rewritten'; readonly head: string; readonly count: number }
  | { readonly kind: 'unparseable' | 'unsafe' }

/**
 * Rewrites wikilinks inside the values of a file's frontmatter, replacing only their characters.
 * Comments and keys are left alone. The result must parse to the same values with only those links
 * changed, or it's `unsafe` and must not be written (the rule of ADR 0004).
 */
export function rewriteFrontmatterLinks(
  head: string,
  decide: KeyedLinkDecision
): FrontmatterLinkRewrite {
  const block = splitHead(head)
  if (block === undefined) return { kind: 'rewritten', head, count: 0 }
  const document = parseDocument(block.yaml)
  if (document.errors.length > 0) return { kind: 'unparseable' }
  const contents = document.contents
  if (contents === null || !isMap(contents)) return { kind: 'rewritten', head, count: 0 }

  let yaml = block.yaml
  let count = 0
  const expected: Record<string, unknown> = {}
  const pairs = contents.items.flatMap((pair) =>
    isScalar(pair.key) && typeof pair.key.value === 'string' ? [{ key: pair.key.value, pair }] : []
  )
  // Back to front, so earlier ranges stay valid while later ones change.
  for (const { key, pair } of [...pairs].reverse()) {
    const range = (pair.value as { range?: [number, number, number] } | null)?.range
    if (range === undefined) continue
    const rewritten = rewriteWikiLinks(
      yaml.slice(range[0], range[1]),
      (link) => decide(link, key),
      { skipCode: false }
    )
    if (rewritten.count === 0) continue
    yaml = `${yaml.slice(0, range[0])}${rewritten.text}${yaml.slice(range[1])}`
    count += rewritten.count
  }
  if (count === 0) return { kind: 'rewritten', head, count: 0 }

  const before = document.toJS() as Record<string, unknown>
  for (const [key, value] of Object.entries(before)) {
    expected[key] = mapStrings(
      value,
      (text) => rewriteWikiLinks(text, (link) => decide(link, key), { skipCode: false }).text
    )
  }
  const after = parseDocument(yaml)
  if (after.errors.length > 0 || !isDeepStrictEqual(after.toJS(), expected)) {
    return { kind: 'unsafe' }
  }
  return { kind: 'rewritten', head: `${block.opening}${yaml}${block.closing}`, count }
}

function mapStrings(value: unknown, transform: (text: string) => string): unknown {
  if (typeof value === 'string') return transform(value)
  if (Array.isArray(value)) return value.map((item: unknown) => mapStrings(item, transform))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapStrings(item, transform)])
    )
  }
  return value
}
