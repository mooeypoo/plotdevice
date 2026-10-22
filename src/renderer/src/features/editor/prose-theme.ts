import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { tags } from '@lezer/highlight'

/** The writing surface: prose typography, a quiet caret, and no code-editor chrome. */
const proseTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--prose)',
      backgroundColor: 'transparent',
      fontFamily: 'var(--font-prose)',
      fontSize: 'var(--prose-size)'
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { overflow: 'visible', fontFamily: 'inherit', lineHeight: '1.72' },
    '.cm-content': {
      maxWidth: 'var(--measure)',
      margin: '0 auto',
      padding: '0 0 40vh',
      caretColor: 'var(--accent)'
    },
    '.cm-line': { padding: '0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
      { backgroundColor: 'var(--selection)' },
    '.cm-placeholder': { color: 'var(--text-faint)', fontStyle: 'italic' },
    '.cm-dimmed': { color: 'var(--text-faint)', transition: 'color 160ms ease' },
    '.cm-dimmed .cm-wikilink': { color: 'inherit', textDecorationColor: 'var(--line-strong)' },
    '.cm-line[dir="auto"]': { textAlign: 'start' },
    '.cm-wikilink': {
      textDecoration: 'underline dotted',
      textUnderlineOffset: '4px',
      textDecorationThickness: '1px'
    },
    '.cm-wikilink-character': { color: 'var(--link-character)' },
    '.cm-wikilink-location': { color: 'var(--link-location)' },
    '.cm-wikilink-note': { color: 'var(--link-note)' },
    '.cm-wikilink-outline': { color: 'var(--link-note)' },
    '.cm-wikilink-part, .cm-wikilink-chapter, .cm-wikilink-scene, .cm-wikilink-untyped': {
      color: 'var(--link-other)'
    },
    '.cm-wikilink-ambiguous': { color: 'var(--warning)', textDecorationStyle: 'wavy' },
    '.cm-wikilink-missing': { color: 'var(--link-missing)', textDecorationStyle: 'dashed' },
    '.cm-wikilink-embed': { fontStyle: 'italic' }
  },
  { dark: true }
)

/** Markdown styling: headings and emphasis look like what they mean; their marks stay visible but dim. */
const proseHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.6em', fontWeight: '400', color: 'var(--text-strong)' },
  { tag: tags.heading2, fontSize: '1.3em', fontWeight: '500', color: 'var(--text-strong)' },
  { tag: [tags.heading3, tags.heading4, tags.heading5, tags.heading6], fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '600', color: 'var(--text-strong)' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.quote, color: 'var(--text-dim)', fontStyle: 'italic' },
  { tag: [tags.processingInstruction, tags.contentSeparator], color: 'var(--text-faint)' },
  { tag: [tags.link, tags.url], color: 'var(--link-other)' },
  {
    tag: tags.monospace,
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85em',
    direction: 'ltr',
    unicodeBidi: 'isolate'
  },
  { tag: tags.comment, color: 'var(--text-faint)', fontStyle: 'italic' }
])

/** The theme and highlighting together. */
export function proseAppearance(): Extension {
  return [proseTheme, syntaxHighlighting(proseHighlight)]
}
