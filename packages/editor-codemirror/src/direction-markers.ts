import type { Direction } from '@plotdevice/domain'

/**
 * Direction overrides in Pandoc's Markdown syntax, written only when needed (ADR 0004). Pandoc honours
 * them when publishing; other Markdown tools show them as readable text.
 *
 *   A paragraph:   ::: {dir=ltr}            A phrase:   נואל ענה: ["It was never",]{dir=ltr} ושתק.
 *                  The letter was sent.
 *                  :::
 *
 * Paragraphs inside lists and quotes cannot hold a fenced div, so their whole text becomes a span.
 */
export const DIV_OPEN = /^:::[ \t]*\{dir=(ltr|rtl)\}[ \t]*\r?$/
export const DIV_CLOSE = /^:::[ \t]*\r?$/
/** `[text]{dir=x}`; the text may contain one level of brackets (a link). */
const SPAN = /\[((?:[^[\]\n]|\[[^[\]\n]*\])*)\]\{dir=(ltr|rtl)\}/g
const SPAN_AT_START = /^\[((?:[^[\]\n]|\[[^[\]\n]*\])*)\]\{dir=(ltr|rtl)\}/
/** Text before a line's own content: list markers, quote markers, heading hashes. */
export const LINE_PREFIX = /^([ \t]*(?:>[ \t]?)*(?:[-+*][ \t]+|\d{1,9}[.)][ \t]+|#{1,6}[ \t]+)?)/

export interface SpanMatch {
  from: number
  to: number
  contentFrom: number
  contentTo: number
  direction: Direction
}

export function findSpans(text: string, offset = 0): SpanMatch[] {
  return [...text.matchAll(SPAN)].map((match) => ({
    from: offset + match.index,
    to: offset + match.index + match[0].length,
    contentFrom: offset + match.index + 1,
    contentTo: offset + match.index + 1 + (match[1] ?? '').length,
    direction: match[2] as Direction,
  }))
}

/** The direction a line's own text is wrapped in, when one span covers all of it (lists and quotes). */
export function wholeLineSpan(text: string): { direction: Direction; prefix: number; inner: string } | null {
  const prefix = LINE_PREFIX.exec(text)?.[0].length ?? 0
  const match = SPAN_AT_START.exec(text.slice(prefix))
  if (!match || prefix + match[0].length !== text.trimEnd().length) return null
  return { direction: match[2] as Direction, prefix, inner: match[1] ?? '' }
}

export const openDiv = (direction: Direction): string => `::: {dir=${direction}}`
export const wrapSpan = (text: string, direction: Direction): string => `[${text}]{dir=${direction}}`
