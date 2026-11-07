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
