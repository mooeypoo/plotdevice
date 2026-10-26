/**
 * A page's details, as blocks to show: Markdown headings, paragraphs, lists, quotes and code, read
 * well enough to display. Inline formatting stays in the text, for `inlineSpans`. Nothing is ever
 * rendered as HTML, and the page's file is never changed by reading it this way.
 */
export type DetailBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: { text: string; depth: number }[] }
  | { kind: 'code'; text: string }

const HEADING = /^#{1,6}\s+(.*?)\s*#*\s*$/
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
      blocks.push({ kind: 'heading', text: heading[1] ?? '' })
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
