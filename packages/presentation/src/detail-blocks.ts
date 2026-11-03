/**
 * A page's details, as blocks to show: Markdown headings, paragraphs, lists, quotes and code, read
 * well enough to display. Inline formatting stays in the text, for `inlineSpans`. Nothing is ever
 * rendered as HTML, and the page's file is never changed by reading it this way.
 */
export type DetailBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: { text: string; depth: number }[] }
  | { kind: 'code'; text: string }

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const FENCE = /^\s*(```|~~~)/

export function detailBlocks(markdown: string): DetailBlock[] {
  const blocks: DetailBlock[] = []
  const lines = markdown.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.trim() === '') continue
    const fence = FENCE.exec(line)
    if (fence) {
      const code: string[] = []
      while (++i < lines.length && !(lines[i] ?? '').trim().startsWith(fence[1] ?? '```')) code.push(lines[i] ?? '')
      blocks.push({ kind: 'code', text: code.join('\n') })
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' })
      continue
    }
    if (LIST_ITEM.test(line)) {
      const items: { text: string; depth: number }[] = []
      const ordered = /\d/.test(LIST_ITEM.exec(line)?.[2] ?? '')
      for (; i < lines.length; i++) {
        const item = LIST_ITEM.exec(lines[i] ?? '')
        const last = items.at(-1)
        if (item) items.push({ text: item[3] ?? '', depth: Math.floor((item[1] ?? '').replace(/\t/g, '  ').length / 2) })
        else if (last && /^\s+\S/.test(lines[i] ?? ''))
          last.text += ` ${(lines[i] ?? '').trim()}` // a wrapped item
        else break
      }
      i--
      blocks.push({ kind: 'list', ordered, items })
      continue
    }
    // A paragraph or quote runs until a blank line or another kind of block.
    const quote = QUOTE.test(line)
    const text: string[] = []
    for (; i < lines.length; i++) {
      const current = lines[i] ?? ''
      if (current.trim() === '' || HEADING.test(current) || LIST_ITEM.test(current) || FENCE.test(current)) break
      if (QUOTE.test(current) !== quote) break
      text.push(quote ? (QUOTE.exec(current)?.[1] ?? '') : current.trim())
    }
    i--
    blocks.push({ kind: quote ? 'quote' : 'paragraph', text: text.join(' ').trim() })
  }
  return blocks
}

/** A part of a page's details: a heading and what follows it, or (`heading: null`) what comes before any heading. */
export interface DetailSection {
  heading: string | null
  blocks: DetailBlock[]
}

/**
 * A page's details split at their top-level headings, so the shelf can open one part at a time.
 * Deeper headings stay inside their part. Details without headings are one unnamed part.
 */
export function detailSections(markdown: string): DetailSection[] {
  const blocks = detailBlocks(markdown)
  const levels = blocks.flatMap((block) => (block.kind === 'heading' ? [block.level] : []))
  const top = Math.min(...levels)
  const sections: DetailSection[] = []
  for (const block of blocks) {
    if (block.kind === 'heading' && block.level === top) sections.push({ heading: block.text, blocks: [] })
    else if (sections.length > 0) sections.at(-1)?.blocks.push(block)
    else sections.push({ heading: null, blocks: [block] })
  }
  return sections
}

/** How many top-level list items a part holds, for a count beside its name; 0 when it isn't a list. */
export const sectionItems = (section: DetailSection): number =>
  section.blocks.reduce((sum, block) => sum + (block.kind === 'list' ? block.items.filter((item) => item.depth === 0).length : 0), 0)
