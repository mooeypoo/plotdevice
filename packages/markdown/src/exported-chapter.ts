import type { Nodes, PhrasingContent, RootContent } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'

export type TextDirection = 'ltr' | 'rtl'

/** Formatting inside a paragraph, as every export format can show it (Milestone 22). */
export type ExportInline =
  | { type: 'text'; value: string }
  | { type: 'emphasis'; children: ExportInline[] }
  | { type: 'strong'; children: ExportInline[] }
  | { type: 'link'; url: string; children: ExportInline[] }
  | { type: 'break' }
  /** A phrase the author marked with a direction: `[text]{dir=ltr}`. */
  | { type: 'span'; direction: TextDirection; children: ExportInline[] }

/**
 * A chapter's blocks for export: the "Word ↔ our formatting" table that every format writes from,
 * and that importing reads into. `direction` is set only where the author marked one; otherwise
 * the book's language and the author's direction setting decide.
 */
export type ExportBlock =
  | { type: 'paragraph'; children: ExportInline[]; direction?: TextDirection }
  | { type: 'heading'; level: number; children: ExportInline[]; direction?: TextDirection }
  | { type: 'quote'; children: ExportBlock[]; direction?: TextDirection }
  | { type: 'list'; ordered: boolean; start: number; items: ExportBlock[][]; direction?: TextDirection }
  | { type: 'scene-break' }

// The editor's direction notation (ADR 0004, `editor-codemirror/direction-markers.ts`).
const DIV_OPEN = /^:::[ \t]*\{dir=(ltr|rtl)\}[ \t]*$/
const DIV_CLOSE = /^:::[ \t]*$/
const SPAN = /\[((?:[^[\]\n]|\[[^[\]\n]*\])*)\]\{dir=(ltr|rtl)\}/g

// Spans are swapped for private-use characters before parsing, so the parser sees ordinary text,
// then rebuilt around whatever formatting they hold. Each is restored exactly where it can't be a span.
const OPEN = { ltr: '', rtl: '' } as const
const CLOSE = { ltr: '', rtl: '' } as const
const MARKER = /([-])/
const RESTORE: Record<string, string> = {
  [OPEN.ltr]: '[',
  [OPEN.rtl]: '[',
  [CLOSE.ltr]: ']{dir=ltr}',
  [CLOSE.rtl]: ']{dir=rtl}',
}
const restore = (text: string): string => text.replace(/[-]/g, (marker) => RESTORE[marker] ?? '')

/**
 * Reads a chapter's text (without frontmatter) into export blocks. Never fails: Markdown that export
 * doesn't format (code, tables, HTML) becomes plain text as written, and is never treated as markup.
 */
export function readChapterForExport(body: string): ExportBlock[] {
  const { text, directionOfLine } = prepare(body)
  const root = fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  return root.children.flatMap((node) => {
    const block = toBlock(node, text)
    if (block === null) return []
    const marked = directionOfLine[(node.position?.start.line ?? 1) - 1]
    if (marked !== undefined && block.type !== 'scene-break' && block.direction === undefined) block.direction = marked
    return [block]
  })
}

/** The words of the blocks without formatting marks, one line per paragraph, for counting words. */
export function plainTextOf(blocks: readonly ExportBlock[]): string {
  const lines: string[] = []
  const inlineText = (inlines: readonly ExportInline[]): string =>
    inlines
      .map((inline) =>
        inline.type === 'text' ? inline.value : inline.type === 'break' ? '\n' : 'children' in inline ? inlineText(inline.children) : '',
      )
      .join('')
  const walk = (block: ExportBlock) => {
    if (block.type === 'paragraph' || block.type === 'heading') lines.push(inlineText(block.children))
    else if (block.type === 'quote') block.children.forEach(walk)
    else if (block.type === 'list') block.items.forEach((item) => item.forEach(walk))
  }
  blocks.forEach(walk)
  return lines.join('\n')
}

/** Removes the direction lines around marked blocks (remembering their direction) and swaps spans for markers. */
function prepare(body: string): { text: string; directionOfLine: (TextDirection | undefined)[] } {
  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  const directionOfLine: (TextDirection | undefined)[] = []
  let open: { line: number; direction: TextDirection } | null = null
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ''
    if (open === null) {
      const match = DIV_OPEN.exec(line)
      if (match) open = { line: index, direction: match[1] as TextDirection }
    } else if (DIV_CLOSE.test(line)) {
      // Only a finished pair is a mark; an opening line with no closing line stays text.
      lines[open.line] = ''
      lines[index] = ''
      for (let inside = open.line + 1; inside < index; inside++) directionOfLine[inside] = open.direction
      open = null
    }
  }
  const text = lines
    .map((line) => line.replace(SPAN, (_, inner: string, direction: TextDirection) => OPEN[direction] + inner + CLOSE[direction]))
    .join('\n')
  return { text, directionOfLine }
}

function toBlock(node: RootContent, source: string): ExportBlock | null {
  switch (node.type) {
    case 'paragraph':
      return withWholeSpanDirection({ type: 'paragraph' as const, children: toInlines(node.children) })
    case 'heading':
      return withWholeSpanDirection({ type: 'heading' as const, level: node.depth, children: toInlines(node.children) })
    case 'thematicBreak':
      return { type: 'scene-break' }
    case 'blockquote':
      return { type: 'quote', children: node.children.flatMap((child) => toBlock(child, source) ?? []) }
    case 'list':
      return {
        type: 'list',
        ordered: node.ordered === true,
        start: node.start ?? 1,
        items: node.children.map((item) => item.children.flatMap((child) => toBlock(child, source) ?? [])),
      }
    case 'definition':
      return null // a link's address written apart; it isn't prose
    case 'code':
    case 'html':
      return asWritten(node.value)
    default:
      // Tables, footnotes and anything else: the lines as written.
      return asWritten(source.slice(node.position?.start.offset ?? 0, node.position?.end.offset ?? 0))
  }
}

function asWritten(text: string): ExportBlock {
  const children: ExportInline[] = []
  restore(text)
    .split('\n')
    .forEach((line, index) => {
      if (index > 0) children.push({ type: 'break' })
      if (line !== '') children.push({ type: 'text', value: line })
    })
  return { type: 'paragraph', children }
}

/** A paragraph that is one marked phrase and nothing else (list items and quotes) takes its direction. */
function withWholeSpanDirection<T extends { children: ExportInline[]; direction?: TextDirection }>(block: T): T {
  const meaningful = block.children.filter((inline) => !(inline.type === 'text' && inline.value.trim() === ''))
  const only = meaningful[0]
  if (meaningful.length === 1 && only?.type === 'span') return { ...block, direction: only.direction, children: only.children }
  return block
}

type Marker = { direction: TextDirection; marker: string }
type Token = ExportInline | ({ type: 'open' } & Marker) | ({ type: 'close' } & Marker)

function toInlines(nodes: readonly PhrasingContent[]): ExportInline[] {
  return tidy(buildSpans(nodes.flatMap(toTokens)))
}

function toTokens(node: PhrasingContent | Nodes): Token[] {
  switch (node.type) {
    case 'text':
      return node.value
        .split(MARKER)
        .filter((piece) => piece !== '')
        .map((piece): Token => {
          if (piece === OPEN.ltr || piece === OPEN.rtl)
            return { type: 'open', direction: piece === OPEN.ltr ? 'ltr' : 'rtl', marker: piece }
          if (piece === CLOSE.ltr || piece === CLOSE.rtl)
            return { type: 'close', direction: piece === CLOSE.ltr ? 'ltr' : 'rtl', marker: piece }
          return { type: 'text', value: piece }
        })
    case 'emphasis':
    case 'strong':
      return [{ type: node.type, children: toInlines(node.children) }]
    case 'link':
      return [{ type: 'link', url: node.url, children: toInlines(node.children) }]
    case 'break':
      return [{ type: 'break' }]
    case 'inlineCode':
    case 'html':
      return [{ type: 'text', value: restore(node.value) }]
    case 'image':
    case 'imageReference':
      return [{ type: 'text', value: node.alt ?? '' }]
    case 'footnoteReference':
      return [{ type: 'text', value: `[^${node.label ?? node.identifier}]` }]
    default:
      // Struck-through text and references keep their words; formatting export doesn't have is dropped.
      return 'children' in node ? (node.children as PhrasingContent[]).flatMap(toTokens) : []
  }
}

/** Pairs opening and closing markers at the same level into spans; a marker left unpaired is restored as text. */
function buildSpans(tokens: readonly Token[]): ExportInline[] {
  type Frame = { direction: TextDirection; marker: string; children: ExportInline[] }
  const top: ExportInline[] = []
  const frames: Frame[] = []
  const current = () => frames.at(-1)?.children ?? top
  for (const token of tokens) {
    if (token.type === 'open') frames.push({ direction: token.direction, marker: token.marker, children: [] })
    else if (token.type === 'close') {
      const frame = frames.at(-1)
      if (frame?.direction === token.direction) {
        frames.pop()
        current().push({ type: 'span', direction: frame.direction, children: frame.children })
      } else current().push({ type: 'text', value: restore(token.marker) })
    } else current().push(token)
  }
  while (frames.length > 0) {
    const frame = frames.pop() as Frame
    current().push({ type: 'text', value: restore(frame.marker) }, ...frame.children)
  }
  return top
}

/** A newline inside a paragraph is a space; neighbouring text joins, and empty text goes. */
function tidy(inlines: ExportInline[]): ExportInline[] {
  const result: ExportInline[] = []
  for (const inline of inlines) {
    const tidied =
      inline.type === 'text'
        ? { type: 'text' as const, value: inline.value.replace(/[ \t]*\n[ \t]*/g, ' ') }
        : 'children' in inline
          ? { ...inline, children: tidy(inline.children) }
          : inline
    const previous = result.at(-1)
    if (tidied.type === 'text' && tidied.value === '') continue
    if (tidied.type === 'text' && previous?.type === 'text') previous.value += tidied.value
    else result.push(tidied)
  }
  return result
}
