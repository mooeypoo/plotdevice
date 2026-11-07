import type { PhrasingContent } from 'mdast'
import { gfmToMarkdown } from 'mdast-util-gfm'
import { toMarkdown, type Options } from 'mdast-util-to-markdown'
import type { TextDirection } from './exported-chapter'

/** Formatting inside an imported paragraph: export's formatting (`ExportInline`), plus a footnote's mark (Milestone 23). */
export type ImportedInline =
  | { type: 'text'; value: string }
  | { type: 'emphasis'; children: ImportedInline[] }
  | { type: 'strong'; children: ImportedInline[] }
  | { type: 'link'; url: string; children: ImportedInline[] }
  | { type: 'break' }
  | { type: 'span'; direction: TextDirection; children: ImportedInline[] }
  | { type: 'footnote'; id: string }

/** One paragraph of an imported Word manuscript, as Plot Device keeps it. */
export type ImportedParagraph =
  | { kind: 'paragraph'; inlines: ImportedInline[] }
  | { kind: 'heading'; level: number; inlines: ImportedInline[] }
  | { kind: 'quote'; inlines: ImportedInline[] }
  | { kind: 'list-item'; ordered: boolean; depth: number; inlines: ImportedInline[] }

/** The words of imported formatting, line breaks as `\n`, footnote marks left out. */
export function importedText(inlines: readonly ImportedInline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === 'text') return inline.value
      if (inline.type === 'break') return '\n'
      if (inline.type === 'footnote') return ''
      return importedText(inline.children)
    })
    .join('')
}

/** A paragraph of an imported chapter, with the direction the reader worked out, or a scene break. */
export type ImportedBlock = (ImportedParagraph & { direction?: TextDirection }) | { kind: 'scene-break' }

const OPTIONS: Options = {
  bullet: '-',
  emphasis: '*',
  strong: '*',
  rule: '*',
  ruleSpaces: true,
  listItemIndent: 'one',
  extensions: [gfmToMarkdown()],
}
const SAFE_URL = /^(?:https?:|mailto:)/i

/**
 * An imported chapter's text as Markdown (Milestone 23), written as the editor writes it: `*italic*`,
 * `**bold**`, `* * *` scene breaks, `-` bullets, a trailing `\` for a line break, and direction marks
 * only where the reader set them (ADR 0004). The author's words are escaped, so nothing in them becomes
 * formatting. Footnotes are numbered from 1 in each chapter, with the notes at the end.
 */
export function importedChapterMarkdown(blocks: readonly ImportedBlock[], footnotes: Readonly<Record<string, ImportedInline[]>>): string {
  const numbers = new Map<string, number>()
  const phrasing = (inlines: readonly ImportedInline[]): PhrasingContent[] =>
    inlines.flatMap((inline): PhrasingContent[] => {
      switch (inline.type) {
        case 'text':
          return [{ type: 'text', value: inline.value }]
        case 'break':
          return [{ type: 'break' }]
        case 'emphasis':
          return [{ type: 'emphasis', children: phrasing(inline.children) }]
        case 'strong':
          return [{ type: 'strong', children: phrasing(inline.children) }]
        case 'span':
          return phrasing(inline.children)
        case 'link':
          return SAFE_URL.test(inline.url.trim())
            ? [{ type: 'link', url: inline.url.trim(), children: phrasing(inline.children) }]
            : phrasing(inline.children)
        case 'footnote': {
          if (!footnotes[inline.id]) return [] // a mark whose note isn't in the file
          if (!numbers.has(inline.id)) numbers.set(inline.id, numbers.size + 1)
          const label = String(numbers.get(inline.id))
          return [{ type: 'footnoteReference', identifier: label, label }]
        }
      }
    })
  const line = (inlines: readonly ImportedInline[]) =>
    toMarkdown({ type: 'paragraph', children: phrasing(inlines) }, OPTIONS).replace(/\n$/, '')
  const wrapped = (text: string, direction: TextDirection | undefined) => (direction ? `[${text}]{dir=${direction}}` : text)

  const out: string[] = []
  // Consecutive list items and quote paragraphs are written together, each run as one block.
  let run: { kind: 'list' | 'quote'; lines: string[] } | null = null
  const counters: number[] = []
  const indents: number[] = []
  const flush = () => {
    if (run) out.push(run.lines.join('\n'))
    run = null
    counters.length = 0
    indents.length = 0
  }
  for (const block of blocks) {
    if (block.kind === 'list-item') {
      if (run?.kind !== 'list') flush()
      run ??= { kind: 'list', lines: [] }
      // A nested item lines up under its parent's text: CommonMark's rule for nesting.
      counters.length = block.depth + 1
      indents.length = block.depth + 1
      const number = (counters[block.depth] ?? 0) + 1
      counters[block.depth] = number
      const marker = block.ordered ? `${number}. ` : '- '
      const indent = block.depth === 0 ? 0 : (indents[block.depth - 1] ?? 0)
      indents[block.depth] = indent + marker.length
      run.lines.push(`${' '.repeat(indent)}${marker}${wrapped(line(block.inlines), block.direction)}`)
      continue
    }
    if (block.kind === 'quote') {
      if (run?.kind !== 'quote') flush()
      run ??= { kind: 'quote', lines: [] }
      const text = wrapped(line(block.inlines), block.direction).replace(/\n/g, '\n> ')
      run.lines.push(`${run.lines.length > 0 ? '>\n' : ''}> ${text}`)
      continue
    }
    flush()
    if (block.kind === 'scene-break') out.push('* * *')
    else {
      const text =
        block.kind === 'heading' ? `${'#'.repeat(Math.min(6, Math.max(2, block.level)))} ${line(block.inlines)}` : line(block.inlines)
      if (text.trim() !== '') out.push(block.direction ? `::: {dir=${block.direction}}\n${text}\n:::` : text)
    }
  }
  flush()
  const notes = [...numbers].map(([id, number]) => `[^${number}]: ${line(footnotes[id] ?? [])}`)
  if (notes.length > 0) out.push(notes.join('\n'))
  return out.length === 0 ? '' : `${out.join('\n\n')}\n`
}
