import type { Heading, List, ListItem, Root, RootContent } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import { readFrontmatter, splitFrontmatter } from './frontmatter'
import type {
  KeptBlock,
  KeptReason,
  ListMarker,
  OutlineHeadingSource,
  OutlineItemSource,
  OutlineSectionSource,
  OutlineWarning,
  ParsedOutline,
  TextRange,
} from './outline-model'
import { contentEndWithin, indentColumns, lineEndAt, lineStartAt } from './text'

/**
 * Reads an outline (ADR 0003): `##` headings are sections, top-level list items are cards, nested
 * items are details at any depth. Everything else is kept in place and reported. Every range points
 * into `source`, so edits can be planned as splices.
 */
export function readOutline(source: string, options: { wholeDocument?: boolean; fresh?: boolean } = {}): ParsedOutline {
  const { frontmatter: fm } = splitFrontmatter(source)
  const frontmatter = fm ? { range: { start: 0, end: fm.text.length }, valid: readFrontmatter(source).ok } : null
  // Unmasked, `---\ntitle: x\n---` reads as a thematic break and a setext heading, inventing a
  // section. Blanking it with spaces keeps every offset the same.
  const masked = frontmatter
    ? source.slice(0, frontmatter.range.end).replace(/[^\r\n]/g, ' ') + source.slice(frontmatter.range.end)
    : source
  const root = options.wholeDocument || hasHtmlBlock(masked) ? parseMarkdown(masked) : parseBySection(masked, !options.fresh)

  const warnings: OutlineWarning[] = []
  if (frontmatter && !frontmatter.valid) warnings.push({ code: 'invalid-frontmatter', range: frontmatter.range })
  const sections: (OutlineSectionSource & { sawCards: boolean })[] = []
  const preamble: KeptBlock[] = []
  let title: OutlineHeadingSource | null = null
  let current: (OutlineSectionSource & { sawCards: boolean }) | null = null
  const nestingSamples: string[] = []

  const keep = (node: RootContent, reason: KeptReason): KeptBlock => {
    const block = { type: node.type, range: rangeOf(node), reason }
    warnings.push({ code: reason, range: block.range })
    return block
  }
  const startSection = (heading: OutlineHeadingSource | null, start: number) => {
    const section = { heading, range: { start, end: start }, contentEnd: start, intro: [], items: [], kept: [], sawCards: false }
    sections.push(section)
    return section
  }

  for (const node of root.children) {
    if (node.type === 'heading' && node.depth === 2) {
      current = startSection(readHeading(source, node), lineStartAt(source, rangeOf(node).start))
    } else if (node.type === 'heading' && node.depth === 1 && !current && !title) {
      title = readHeading(source, node)
    } else if (node.type === 'list') {
      current ??= startSection(null, lineStartAt(source, rangeOf(node).start))
      current.items.push(...readList(source, node, warnings, nestingSamples))
      current.sawCards = true
    } else if (node.type === 'paragraph' && current && !current.sawCards) {
      current.intro.push(rangeOf(node))
    } else if (node.type === 'paragraph' && !current) {
      preamble.push({ type: node.type, range: rangeOf(node), reason: 'unsupported-block' })
    } else {
      const reason: KeptReason =
        node.type === 'heading' ? 'subheading' : node.type === 'paragraph' ? 'paragraph-after-cards' : 'unsupported-block'
      ;(current ? current.kept : preamble).push(keep(node, reason))
    }
  }

  for (const [index, section] of sections.entries()) {
    section.range.end = sections[index + 1]?.range.start ?? source.length
    section.contentEnd = contentEndWithin(source, section.range.start, section.range.end)
  }

  return {
    source,
    frontmatter,
    title,
    preamble,
    sections: sections.map(({ heading, range, contentEnd, intro, items, kept }) => ({ heading, range, contentEnd, intro, items, kept })),
    nestingUnit: mostCommon(nestingSamples) ?? null,
    warnings,
  }
}

function parseMarkdown(text: string): Root {
  return fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
}

/**
 * The parser slows down superlinearly on long nested lists (2,000 cards: about a second; Spike A).
 * A `##` heading at column 0 closes every open block, so each section parses on its own and offsets
 * shift back. Splits never fall inside fenced code or a multi-line HTML comment.
 */
function parseBySection(text: string, cached: boolean): Root {
  const starts = [0, ...sectionStarts(text)]
  const children: RootContent[] = []
  for (const [index, start] of starts.entries()) {
    const end = starts[index + 1] ?? text.length
    if (end <= start) continue
    const section = text.slice(start, end)
    for (const child of cached ? parsedSection(section) : parseMarkdown(section).children) children.push(shifted(child, start))
  }
  return { type: 'root', children }
}

/**
 * Recent sections' parses, by their exact text. An edit changes one or two sections of an outline,
 * so reading it again parses only those: on 2,000 cards, a move went from about 350 ms of parsing to
 * a few. The cache holds unshifted trees that are never handed out; each read gets its own copy.
 */
const sectionCache = new Map<string, RootContent[]>()
const SECTIONS_KEPT = 500

function parsedSection(text: string): RootContent[] {
  let children = sectionCache.get(text)
  if (children)
    sectionCache.delete(text) // to the back: the most recently used
  else children = parseMarkdown(text).children
  sectionCache.set(text, children)
  if (sectionCache.size > SECTIONS_KEPT) sectionCache.delete(sectionCache.keys().next().value ?? '')
  return children
}

/** Other multi-line HTML blocks could hide a `##` line from the splitter, so such files parse whole. */
function hasHtmlBlock(text: string): boolean {
  return /^ {0,3}<(?!!--)[A-Za-z/]/m.test(text)
}

function sectionStarts(text: string): number[] {
  const offsets: number[] = []
  let fence: string | null = null
  let inComment = false
  let offset = 0
  for (const line of text.split('\n')) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (fence) {
      if (fenceMatch?.[1]?.startsWith(fence) && /^ {0,3}[`~]+[ \t]*\r?$/.test(line)) fence = null
    } else if (inComment) {
      if (line.includes('-->')) inComment = false
    } else if (fenceMatch?.[1]) {
      fence = fenceMatch[1]
    } else if (/^ {0,3}<!--/.test(line) && !line.includes('-->')) {
      inComment = true
    } else if (offset > 0 && /^##(?:[ \t]|\r?$)/.test(line)) {
      offsets.push(offset)
    }
    offset += line.length + 1
  }
  return offsets
}

type Positioned = {
  position?: { start: { offset?: number | undefined }; end: { offset?: number | undefined } } | undefined
  children?: unknown[]
}

/** A copy of `node` with every offset moved on by `base`; the original (perhaps cached) is left alone. */
function shifted<T extends RootContent>(node: T, base: number): T {
  const copy = (n: Positioned): Positioned => {
    const result: Positioned = { ...n }
    if (n.position)
      result.position = {
        ...n.position,
        start: { ...n.position.start, offset: n.position.start.offset === undefined ? undefined : n.position.start.offset + base },
        end: { ...n.position.end, offset: n.position.end.offset === undefined ? undefined : n.position.end.offset + base },
      }
    if (n.children) result.children = n.children.map((child) => copy(child as Positioned))
    return result
  }
  return copy(node as Positioned) as T
}

function readList(source: string, list: List, warnings: OutlineWarning[], nestingSamples: string[]): OutlineItemSource[] {
  const items = list.children.map((item) => readItem(source, item, list.spread ?? false, warnings, nestingSamples))
  for (const [index, item] of items.entries()) {
    item.isFirstInList = index === 0
    item.nextInList = items[index + 1] ?? null
  }
  return items
}

// Sticky, so reading a marker never copies the rest of the document (which made parsing quadratic).
const MARKER = /(?:([-+*])|(\d{1,9})([.)]))([ \t]*)/y

function readItem(
  source: string,
  node: ListItem,
  listIsLoose: boolean,
  warnings: OutlineWarning[],
  nestingSamples: string[],
): OutlineItemSource {
  const range = rangeOf(node)
  const lineStart = lineStartAt(source, range.start)
  const indent = source.slice(lineStart, range.start)
  const movable = /^[ \t]*$/.test(indent)
  if (!movable) warnings.push({ code: 'unmovable-item', range })

  MARKER.lastIndex = range.start
  const match = MARKER.exec(source)
  if (!match) throw new Error(`list item without a marker at ${range.start}`)
  const [whole, bullet, number, delimiter, gap = ''] = match
  const marker: ListMarker = bullet
    ? { kind: 'bullet', char: bullet as '-' | '*' | '+' }
    : { kind: 'ordered', number: Number(number), delimiter: delimiter as '.' | ')' }

  const children: OutlineItemSource[] = []
  const kept: KeptBlock[] = []
  let textRange: TextRange = { start: range.start + whole.length, end: range.start + whole.length }
  for (const [index, child] of node.children.entries()) {
    if (index === 0 && child.type === 'paragraph') {
      textRange = rangeOf(child) // GFM starts a task item's paragraph after its checkbox
    } else if (child.type === 'list') {
      for (const nested of readList(source, child, warnings, nestingSamples)) {
        if (movable && nested.movable) nestingSamples.push(relativeIndent(indent, nested.indent))
        children.push(nested)
      }
    } else {
      const block: KeptBlock = { type: child.type, range: rangeOf(child), reason: 'item-continuation' }
      warnings.push({ code: block.reason, range: block.range })
      kept.push(block)
    }
  }

  return {
    text: source.slice(textRange.start, textRange.end),
    textRange,
    lineRange: { start: lineStart, end: lineEndAt(source, range.end) },
    indent,
    marker,
    gap,
    checked: node.checked ?? null,
    children,
    kept,
    listIsLoose,
    isFirstInList: false,
    nextInList: null,
    movable,
  }
}

const ATX_HEADING = /^( {0,3}#{1,6})([ \t]+)(.*?)(?:[ \t]+#+)?[ \t]*\r?$/

function readHeading(source: string, node: Heading): OutlineHeadingSource {
  const range = rangeOf(node)
  const lineStart = lineStartAt(source, range.start)
  const lineRange = { start: lineStart, end: lineEndAt(source, range.end) }
  const firstLine = source.slice(lineStart, lineEndAt(source, lineStart)).replace(/\n$/, '')
  const atx = ATX_HEADING.exec(firstLine)
  if (atx) {
    const start = lineStart + (atx[1] ?? '').length + (atx[2] ?? '').length
    const text = atx[3] ?? ''
    return { text, textRange: { start, end: start + text.length }, lineRange }
  }
  // A setext heading, or an ATX heading with no text: the text is whatever the parser saw.
  const first = node.children[0]
  const last = node.children.at(-1)
  const textRange = first && last ? { start: rangeOf(first).start, end: rangeOf(last).end } : { start: range.end, end: range.end }
  return { text: source.slice(textRange.start, textRange.end), textRange, lineRange }
}

function rangeOf(node: Positioned): TextRange {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined) throw new Error('Markdown node without offsets')
  return { start, end }
}

function relativeIndent(parentIndent: string, childIndent: string): string {
  return childIndent.startsWith(parentIndent)
    ? childIndent.slice(parentIndent.length)
    : ' '.repeat(indentColumns(childIndent) - indentColumns(parentIndent))
}

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}
