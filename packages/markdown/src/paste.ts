import type { Element, Root as HastRoot } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import { toMdast } from 'hast-util-to-mdast'
import type { Nodes, Paragraph, PhrasingContent, Root, RootContent } from 'mdast'
import { toMarkdown } from 'mdast-util-to-markdown'

/**
 * Pasted HTML (from Word, Google Docs, web pages) as clean Markdown, keeping only the formatting the
 * editor supports: paragraphs, headings, bold, italic, links, lists, quotes, scene breaks and line
 * breaks. Images, scripts and styles are dropped; tables and code keep their text. Runs without a
 * DOM, so the page's Content Security Policy doesn't get in the way (ADR 0004).
 */
export function htmlToMarkdown(html: string): string {
  return serialize(convert(html))
}

/**
 * What to insert for a paste: the HTML converted, when it carries formatting; otherwise the plain text
 * as it is, so Markdown copied from a code editor isn't escaped into literal asterisks.
 */
export function pastedMarkdown(html: string, plain: string): string {
  if (html.trim() === '') return plain
  const converted = convert(html)
  return hasFormatting(converted) || plain.trim() === '' ? serialize(converted) : plain
}

function convert(html: string): Root {
  const hast = fromHtml(html, { fragment: true })
  readInlineStyles(hast)
  return supported(toMdast(hast)) as Root
}

const FORMATTING = new Set(['emphasis', 'strong', 'link', 'heading', 'list', 'blockquote', 'break', 'thematicBreak'])

function hasFormatting(node: Nodes): boolean {
  return FORMATTING.has(node.type) || ('children' in node && (node.children as Nodes[]).some(hasFormatting))
}

function serialize(root: Root): string {
  const markdown = toMarkdown(root, {
    bullet: '-',
    emphasis: '*',
    strong: '*',
    rule: '*',
    ruleSpaces: true,
    listItemIndent: 'one',
  })
  return markdown.trim() === '' ? '' : markdown
}

/** Google Docs marks bold and italic with styles, and wraps everything in `<b style="font-weight:normal">`. */
function readInlineStyles(node: HastRoot | Element): void {
  for (const child of node.children) {
    if (child.type !== 'element') continue
    const style = typeof child.properties.style === 'string' ? child.properties.style.toLowerCase() : ''
    const weight = /font-weight\s*:\s*([a-z0-9]+)/.exec(style)?.[1]
    const bold = weight === 'bold' || weight === 'bolder' || (weight !== undefined && Number(weight) >= 600)
    const notBold = weight === 'normal' || weight === 'lighter' || (weight !== undefined && Number(weight) < 600)
    const italic = /font-style\s*:\s*italic/.test(style)
    if ((child.tagName === 'b' || child.tagName === 'strong') && notBold) child.tagName = 'span'
    else if (child.tagName === 'span' && bold) child.tagName = 'strong'
    if (child.tagName === 'span' && italic) child.tagName = 'em'
    else if (child.tagName === 'strong' && italic) child.children = [{ type: 'element', tagName: 'em', properties: {}, children: child.children }]
    readInlineStyles(child)
  }
}

const SAFE_URL = /^(?:https?:|mailto:|[^:]*$)/i

function supported(node: Nodes): Nodes[] | Nodes {
  switch (node.type) {
    case 'root':
      return { ...node, children: blocks(node.children) }
    case 'paragraph':
    case 'heading':
      return { ...node, children: phrasing(node.children) }
    case 'blockquote':
    case 'listItem':
      return { ...node, children: blocks(node.children) as typeof node.children }
    case 'list':
      return { ...node, children: node.children.map((item) => supported(item)).flat() as typeof node.children }
    case 'emphasis':
    case 'strong':
      return { ...node, children: phrasing(node.children) }
    case 'link':
      return SAFE_URL.test(node.url) ? { ...node, title: null, children: phrasing(node.children) } : phrasing(node.children)
    case 'text':
    case 'break':
    case 'thematicBreak':
      return node
    case 'inlineCode':
      return { type: 'text', value: node.value }
    case 'code':
      return paragraphOf([{ type: 'text', value: node.value }])
    case 'table':
      return node.children.map((row) => paragraphOf(withSpaces(row.children.map((cell) => phrasing(cell.children)))))
    default:
      return 'children' in node ? (node.children as Nodes[]).flatMap((child) => supported(child)) : []
  }
}

function blocks(children: RootContent[]): RootContent[] {
  const result: RootContent[] = []
  let loose: PhrasingContent[] = []
  const flush = (): void => {
    if (loose.length > 0) result.push(paragraphOf(loose))
    loose = []
  }
  for (const node of children.flatMap((child) => supported(child)) as RootContent[]) {
    if (isPhrasing(node)) loose.push(node)
    else {
      flush()
      if (node.type !== 'paragraph' || node.children.length > 0) result.push(node)
    }
  }
  flush()
  return result
}

function phrasing(children: RootContent[]): PhrasingContent[] {
  const result = (children.flatMap((child) => supported(child)) as RootContent[]).filter(isPhrasing)
  return result.flatMap((node) => (node.type === 'emphasis' || node.type === 'strong' ? outerSpaces(node) : [node]))
}

/** `** that year.**` isn't bold in Markdown: spaces at the edges of bold or italic move outside it. */
function outerSpaces(node: Extract<PhrasingContent, { type: 'emphasis' | 'strong' }>): PhrasingContent[] {
  const first = node.children[0]
  const last = node.children.at(-1)
  const before = first?.type === 'text' ? (/^\s+/.exec(first.value)?.[0] ?? '') : ''
  const after = last?.type === 'text' ? (/\s+$/.exec(last.value)?.[0] ?? '') : ''
  if (first?.type === 'text') first.value = first.value.slice(before.length)
  if (last?.type === 'text') last.value = last.value.slice(0, last.value.length - after.length)
  const empty = node.children.every((child) => child.type === 'text' && child.value === '')
  return [...(before ? [{ type: 'text' as const, value: before }] : []), ...(empty ? [] : [node]), ...(after ? [{ type: 'text' as const, value: after }] : [])]
}

function withSpaces(cells: PhrasingContent[][]): PhrasingContent[] {
  return cells.filter((cell) => cell.length > 0).flatMap((cell, i) => (i === 0 ? cell : [{ type: 'text' as const, value: ' ' }, ...cell]))
}

const paragraphOf = (children: PhrasingContent[]): Paragraph => ({ type: 'paragraph', children })

function isPhrasing(node: RootContent): node is PhrasingContent {
  return node.type === 'text' || node.type === 'emphasis' || node.type === 'strong' || node.type === 'link' || node.type === 'break'
}

