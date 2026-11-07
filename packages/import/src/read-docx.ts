import type { ManuscriptParagraph } from '@plotdevice/domain'
import { importedText, type ImportedInline, type ImportedParagraph } from '@plotdevice/markdown'
import { err, ok, type Result } from '@plotdevice/shared'
import { strFromU8, unzipSync, type Unzipped } from 'fflate'
import type { Element, ElementContent, RootContent } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import mammoth from 'mammoth'

/** A paragraph as the preview splits it and as the chapter's Markdown is made from it. */
export type ManuscriptPart = ImportedParagraph & ManuscriptParagraph

export interface ImportedManuscript {
  paragraphs: ManuscriptPart[]
  /** Footnotes by the id their marks use. */
  footnotes: Record<string, ImportedInline[]>
  /** What won't come in, counted for the preview. Tracked changes are taken as accepted. */
  leftOut: { comments: number; pictures: number; tables: number }
  /** The file's own title and author (File → Properties in Word), if it has them. */
  details: { title: string | null; author: string | null }
}

export type ReadProblem = 'not-a-word-file' | 'old-or-protected' | 'unreadable'

// Word's Title style, quotes, and our own export's "Part" style; page breaks as a marker the reader splits on.
const STYLE_MAP = [
  "p[style-name='Title'] => h1.title:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
  "p[style-name='Part'] => h1:fresh",
  "br[type='page'] => hr.page-break",
]

/**
 * Reads a Word manuscript (Milestone 23). Mammoth gives the text and its formatting, with tracked
 * changes accepted; a small pass of our own over the zip counts what won't come in (comments,
 * pictures, tables), which Mammoth drops or keeps without saying, and reads the file's title and
 * author. The file is untrusted: its HTML is only ever read into paragraphs, never shown as markup.
 */
export async function readDocx(bytes: Uint8Array): Promise<Result<ImportedManuscript, ReadProblem>> {
  // Old .doc files and password-protected .docx files are both OLE compound files, not zips.
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return err('old-or-protected')
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return err('not-a-word-file')
  let files: Unzipped
  try {
    files = unzipSync(bytes)
  } catch {
    return err('not-a-word-file')
  }
  const document = files['word/document.xml']
  if (!document) return err('not-a-word-file')

  let html: string
  try {
    // Mammoth's Node build reads `buffer` with JSZip, which takes any bytes; its types say Node's Buffer.
    html = (await mammoth.convertToHtml({ buffer: bytes as never }, { styleMap: STYLE_MAP })).value
  } catch {
    return err('unreadable')
  }

  const documentXml = strFromU8(document)
  const count = (text: string | undefined, pattern: RegExp) => (text === undefined ? 0 : (text.match(pattern) ?? []).length)
  const comments = files['word/comments.xml']
  const core = files['docProps/core.xml'] ? strFromU8(files['docProps/core.xml']) : ''
  return ok({
    ...readHtml(html),
    leftOut: {
      comments: count(comments && strFromU8(comments), /<w:comment\b/g),
      pictures: count(documentXml, /<w:drawing\b|<w:pict\b/g),
      tables: count(documentXml, /<w:tbl>/g),
    },
    details: { title: coreValue(core, 'dc:title'), author: coreValue(core, 'dc:creator') },
  })
}

function coreValue(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`).exec(xml)
  const value = match?.[1]
    ?.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&(lt|gt|quot|apos|amp);/g, (_, name: string) => ({ lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' })[name] ?? '')
    .trim()
  return value ? value : null
}

const isElement = (node: RootContent | ElementContent): node is Element => node.type === 'element'
const classes = (element: Element): string[] => {
  const value = element.properties['className']
  return Array.isArray(value) ? value.map(String) : []
}
const isPageBreak = (node: RootContent | ElementContent) => isElement(node) && node.tagName === 'hr' && classes(node).includes('page-break')
const isFootnoteList = (element: Element) =>
  element.tagName === 'ol' && element.children.some((li) => isElement(li) && /^(foot|end)note-/.test(String(li.properties['id'] ?? '')))

/** Mammoth's HTML as paragraphs, with page breaks marked on the paragraph after them, and footnotes apart. */
function readHtml(html: string): Pick<ImportedManuscript, 'paragraphs' | 'footnotes'> {
  const root = fromHtml(html, { fragment: true })
  const paragraphs: ManuscriptPart[] = []
  const footnotes: Record<string, ImportedInline[]> = {}
  let pageBreak = false

  const push = (paragraph: ImportedParagraph, title = false) => {
    const inlines = tidy(paragraph.inlines)
    const text = importedText(inlines)
    if (text.trim() === '' && !inlines.some((inline) => inline.type === 'footnote')) return
    paragraphs.push({
      ...paragraph,
      inlines,
      text,
      heading: paragraph.kind === 'heading' ? paragraph.level : 0,
      title,
      pageBreakBefore: pageBreak,
    })
    pageBreak = false
  }

  /** Inline content, split where a page break falls inside it. */
  const segments = (nodes: readonly ElementContent[]): ImportedInline[][] => {
    const parts: ImportedInline[][] = [[]]
    for (const node of nodes) {
      if (isPageBreak(node)) parts.push([])
      else (parts[parts.length - 1] as ImportedInline[]).push(...inline(node))
    }
    return parts
  }
  const pushSegments = (nodes: readonly ElementContent[], make: (inlines: ImportedInline[]) => ImportedParagraph, title = false) => {
    segments(nodes).forEach((part, index) => {
      if (index > 0) pageBreak = true
      push(make(part), title)
    })
  }

  const list = (element: Element, ordered: boolean, depth: number) => {
    for (const item of element.children) {
      if (!isElement(item) || item.tagName !== 'li') continue
      const own = item.children.filter((child) => !(isElement(child) && (child.tagName === 'ul' || child.tagName === 'ol')))
      pushSegments(own, (inlines) => ({ kind: 'list-item', ordered, depth, inlines }))
      for (const child of item.children)
        if (isElement(child) && (child.tagName === 'ul' || child.tagName === 'ol')) list(child, child.tagName === 'ol', depth + 1)
    }
  }

  const block = (node: RootContent | ElementContent) => {
    if (isPageBreak(node)) {
      pageBreak = true
      return
    }
    if (!isElement(node)) return
    const tag = node.tagName
    const heading = /^h([1-6])$/.exec(tag)
    if (heading) {
      if (classes(node).includes('title')) pushSegments(node.children, (inlines) => ({ kind: 'paragraph', inlines }), true)
      else pushSegments(node.children, (inlines) => ({ kind: 'heading', level: Number(heading[1]), inlines }))
    } else if (tag === 'p') pushSegments(node.children, (inlines) => ({ kind: 'paragraph', inlines }))
    else if (tag === 'blockquote')
      for (const child of node.children) {
        if (isElement(child) && child.tagName === 'p') pushSegments(child.children, (inlines) => ({ kind: 'quote', inlines }))
        else block(child)
      }
    else if (isFootnoteList(node))
      for (const item of node.children) {
        if (!isElement(item)) continue
        const id = String(item.properties['id'] ?? '')
        const content = item.children.flatMap((child) => (isElement(child) && child.tagName === 'p' ? child.children : [child]))
        footnotes[id] = tidy(content.flatMap(inline))
      }
    else if (tag === 'ul' || tag === 'ol') list(node, tag === 'ol', 0)
    else if (tag === 'table' || tag === 'img')
      return // counted, left out
    else node.children.forEach(block)
  }

  root.children.forEach(block)
  return { paragraphs, footnotes }
}

function inline(node: ElementContent): ImportedInline[] {
  if (node.type === 'text') return [{ type: 'text', value: node.value }]
  if (!isElement(node)) return []
  const children = () => node.children.flatMap(inline)
  switch (node.tagName) {
    case 'em':
    case 'i':
      return [{ type: 'emphasis', children: children() }]
    case 'strong':
    case 'b':
      return [{ type: 'strong', children: children() }]
    case 'br':
      return [{ type: 'break' }]
    case 'img':
      return []
    case 'a': {
      const href = String(node.properties['href'] ?? '')
      if (/^#(foot|end)note-ref-/.test(href)) return [] // the "↑" back to the text, in a note
      if (/^#(foot|end)note-/.test(href)) return [{ type: 'footnote', id: href.slice(1) }]
      return href === '' ? children() : [{ type: 'link', url: href, children: children() }]
    }
    default:
      // Superscripts (around footnote marks), underlines, strike-throughs: their words, without the formatting.
      return children()
  }
}

/** Neighbouring text joined, empty formatting dropped, and the space before a note's "↑" trimmed. */
function tidy(inlines: readonly ImportedInline[]): ImportedInline[] {
  const result: ImportedInline[] = []
  for (const item of inlines) {
    const tidied: ImportedInline = 'children' in item ? { ...item, children: tidy(item.children) } : item
    if ('children' in tidied && tidied.children.length === 0) continue
    const previous = result.at(-1)
    if (tidied.type === 'text' && previous?.type === 'text') previous.value += tidied.value
    else if (tidied.type !== 'text' || tidied.value !== '') result.push(tidied.type === 'text' ? { ...tidied } : tidied)
  }
  const last = result.at(-1)
  if (last?.type === 'text') last.value = last.value.replace(/\s+$/, '')
  return result
}
