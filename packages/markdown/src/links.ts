import type { Nodes, Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { basenameOf, collisionKey, relativePath, resolveRelative, stemOf } from '@plotdevice/shared'
import { applySplices, type Splice } from './text'

export interface RewriteOptions {
  /**
   * True when no other file in the project shares the renamed file's name. Only then can a bare
   * `[[name]]` (Obsidian resolves it by name) safely be taken to mean the renamed file.
   */
  wikilinkNameIsUnique: boolean
}

const INLINE = /\]\((<[^>\n]*>|[^\s)]+)/g
const DEFINITION = /^ {0,3}\[[^\]\n]+\]:[ \t]*(<[^>\n]*>|\S+)/gm
const WIKILINK = /\[\[([^\]|#\n]+)(#[^\]|\n]*)?(\|[^\]\n]*)?\]\]/g

/**
 * Rewrites every link in `text` (a file in `fileDir`) that points at `from`, so it points at `to`:
 * inline links, reference definitions and `[[wikilinks]]`. Matches by resolved path, never by link text;
 * code is never touched. Fragments, titles, aliases and the link's own style are kept.
 */
export function rewriteLinksTo(text: string, fileDir: string, from: string, to: string, options: RewriteOptions): { text: string; count: number } {
  const protectedRanges = codeRanges(text)
  const inCode = (offset: number): boolean => protectedRanges.some((range) => offset >= range.start && offset < range.end)
  const splices: Splice[] = []

  for (const pattern of [INLINE, DEFINITION]) {
    for (const match of text.matchAll(pattern)) {
      const destination = match[1] ?? ''
      const start = match.index + match[0].length - destination.length
      if (inCode(match.index)) continue
      const replacement = rewriteDestination(destination, fileDir, from, to)
      if (replacement !== null) splices.push({ start, end: start + destination.length, text: replacement })
    }
  }

  for (const match of text.matchAll(WIKILINK)) {
    if (inCode(match.index)) continue
    const target = (match[1] ?? '').trim()
    const pathForm = target.includes('/')
    const fromWithoutExtension = from.replace(/\.md$/i, '')
    const means = pathForm
      ? collisionKey(target.replace(/\.md$/i, '')) === collisionKey(fromWithoutExtension)
      : options.wikilinkNameIsUnique && (collisionKey(target) === collisionKey(stemOf(from)) || collisionKey(target) === collisionKey(basenameOf(from)))
    if (!means) continue
    const newTarget = pathForm ? to.replace(/\.md$/i, '') : stemOf(to)
    const start = match.index + 2 + (match[1] ?? '').indexOf(target)
    splices.push({ start, end: start + target.length, text: newTarget })
  }

  return { text: applySplices(text, splices), count: splices.length }
}

/** The new destination if `destination` points at `from`; `null` otherwise. */
function rewriteDestination(destination: string, fileDir: string, from: string, to: string): string | null {
  const angle = destination.startsWith('<')
  const raw = angle ? destination.slice(1, -1) : destination
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null // http:, mailto:, …
  const hash = raw.indexOf('#')
  const pathPart = hash === -1 ? raw : raw.slice(0, hash)
  const fragment = hash === -1 ? '' : raw.slice(hash)
  let decoded: string
  try {
    decoded = decodeURI(pathPart)
  } catch {
    return null
  }
  const resolved = resolveRelative(fileDir, decoded)
  if (resolved === null || collisionKey(resolved) !== collisionKey(from)) return null
  const relative = relativePath(fileDir, to)
  const encoded = pathPart.includes('%') ? encodeURI(relative) : relative
  return angle || /[\s<>()]/.test(encoded) ? `<${encoded}${fragment}>` : `${encoded}${fragment}`
}

/** Where code is (fenced, indented, inline): links there are text, not links. */
function codeRanges(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = []
  const visit = (node: Nodes): void => {
    if ((node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') && node.position) {
      ranges.push({ start: node.position.start.offset ?? 0, end: node.position.end.offset ?? 0 })
    }
    if ('children' in node) for (const child of node.children as Nodes[]) visit(child)
  }
  visit(fromMarkdown(text) as Root)
  return ranges
}
