import { splitFrontmatter } from './split-frontmatter'

/**
 * A markdown file as three exact pieces. `head` is everything from after the BOM through the
 * closing `---` line (empty when there is no frontmatter); writing the body never changes it.
 */
export interface MarkdownFileParts {
  readonly hasBom: boolean
  readonly head: string
  readonly body: string
}

/** A file split into parts, or why it can't be (such files are never written). */
export type MarkdownFileSplit =
  | { readonly kind: 'parts'; readonly parts: MarkdownFileParts }
  | { readonly kind: 'invalid-encoding' | 'unclosed' }

const BOM = '﻿'
const encoder = new TextEncoder()

/** Splits a file's bytes. `composeMarkdownFile` turns the result back into the same bytes. */
export function splitMarkdownFile(bytes: Uint8Array): MarkdownFileSplit {
  const split = splitFrontmatter(bytes)
  switch (split.kind) {
    case 'invalid-encoding':
    case 'unclosed':
      return { kind: split.kind }
    case 'none': {
      const start = split.hasBom ? BOM.length : 0
      return {
        kind: 'parts',
        parts: { hasBom: split.hasBom, head: '', body: split.text.slice(start) }
      }
    }
    case 'frontmatter': {
      const start = split.hasBom ? BOM.length : 0
      return {
        kind: 'parts',
        parts: {
          hasBom: split.hasBom,
          head: split.text.slice(start, split.bodyStart),
          body: split.text.slice(split.bodyStart)
        }
      }
    }
  }
}

/** Joins the parts back into bytes. */
export function composeMarkdownFile(parts: MarkdownFileParts): Uint8Array {
  return encoder.encode(`${parts.hasBom ? BOM : ''}${parts.head}${parts.body}`)
}

/** The body as the editor sees it: every line ending as `\n`. */
export function toEditorText(body: string): string {
  return body.replace(/\r\n/gu, '\n')
}

/**
 * The body to write for `editorText`. If the text is unchanged the original body comes back
 * untouched (so mixed line endings survive); otherwise lines end with the file's usual ending.
 */
export function fromEditorText(editorText: string, parts: MarkdownFileParts): string {
  if (toEditorText(parts.body) === editorText) return parts.body
  const ending = dominantLineEnding(parts.body) ?? dominantLineEnding(parts.head) ?? '\n'
  return ending === '\n' ? editorText : editorText.replace(/\n/gu, '\r\n')
}

/** The line ending used most in `text`, or `undefined` if it has none. Ties go to LF. */
export function dominantLineEnding(text: string): '\n' | '\r\n' | undefined {
  const crlf = text.match(/\r\n/gu)?.length ?? 0
  const lf = (text.match(/\n/gu)?.length ?? 0) - crlf
  if (crlf === 0 && lf === 0) return undefined
  return crlf > lf ? '\r\n' : '\n'
}
