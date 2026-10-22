import { codeRanges, insideAny, type TextRange } from '../../../shared-kernel/code-ranges'
import { findWikiLinks } from '../../../shared-kernel/link-rewriter'
import type { WikiLink } from '../../../shared-kernel/wiki-link'
import { splitOutlineLines, type OutlineLine } from './outline-lines'

/** Lines `[start, end)` of an outline's body, by index. */
export interface LineRange {
  readonly start: number
  readonly end: number
}

/** A top-level bullet in a column: one card on the board (ADR 0020). */
export interface OutlineBeat {
  /** The bullet's line. */
  readonly line: number
  readonly marker: '-' | '*' | '+'
  /** The first line's text after the marker, as written (links and tags included). */
  readonly title: string
  /** The bullet and its notes. */
  readonly lines: LineRange
  /** The lines after the bullet that belong to it; empty when it has none. */
  readonly notes: LineRange
  /** Wikilinks in the first line, as written; P2 resolves them to chapters. */
  readonly wikiLinks: readonly WikiLink[]
  /** Markdown links in the first line, each as written (`[text](address)`). */
  readonly markdownLinks: readonly string[]
  /** `#tags` in the first line, without the `#`; P2 matches them against thread keys. */
  readonly tags: readonly string[]
}

/** A `##` heading and everything up to the next one: one column on the board. */
export interface OutlineColumn {
  /** The heading's line. */
  readonly line: number
  readonly title: string
  /** The heading and every line up to the next `##` heading or the end. */
  readonly lines: LineRange
  readonly beats: readonly OutlineBeat[]
}

/** What the board reads from an outline's body. Every other line is plain content. */
export interface OutlineStructure {
  readonly lines: readonly OutlineLine[]
  /** The lines before the first column. */
  readonly preamble: LineRange
  readonly columns: readonly OutlineColumn[]
}

const FENCE = /^( {0,3})(`{3,}|~{3,})/u
const COLUMN = /^ {0,3}##(?!#)(?:[ \t]+(.*?))?[ \t]*$/u
const CLOSING_HASHES = /(?:^|[ \t]+)#+$/u
const BULLET = /^([-*+])[ \t]+(\S.*)$/u
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/u
const HTML_BLOCK = /^ {0,3}</u
const BLANK = /^[ \t]*$/u
const INDENTED = /^[ \t]/u
/** Lines that start a block of their own, so they never continue a beat's paragraph. */
const BLOCK_START =
  /^ {0,3}(?:#{1,6}(?:[ \t]|$)|>|[-*+](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$)|`{3,}|~{3,}|<)/u
const TAG = /(^|[\s(])#([\p{L}\p{N}_-]+)/gu
const MARKDOWN_LINK = /!?\[[^\]\n]*\]\([^)\s]+\)/gu
const WIKI_LINK_SPAN = /!?\[\[[^[\]\n]*\]\]/gu

/**
 * Reads the board's structure from an outline's body (ADR 0020). Conservative: a line that isn't
 * clearly a column heading, a beat, or a beat's notes is plain content, and code is never read.
 */
export function readOutlineStructure(body: string): OutlineStructure {
  const lines = splitOutlineLines(body)
  const columns: { line: number; title: string; beats: OutlineBeat[] }[] = []
  let beat: { line: number; marker: OutlineBeat['marker']; title: string; end: number } | undefined
  let fence: { readonly marker: string; readonly inNotes: boolean } | undefined
  let html = false

  const closeBeat = (): void => {
    if (beat === undefined) return
    columns.at(-1)?.beats.push(toBeat(beat.line, beat.marker, beat.title, beat.end))
    beat = undefined
  }

  for (const [index, { text }] of lines.entries()) {
    if (fence !== undefined) {
      const closing = FENCE.exec(text)?.[2]
      if (fence.inNotes && beat !== undefined) beat.end = index + 1
      if (
        closing !== undefined &&
        closing[0] === fence.marker[0] &&
        closing.length >= fence.marker.length
      ) {
        fence = undefined
      }
      continue
    }
    if (html) {
      if (BLANK.test(text)) html = false
      continue
    }
    if (BLANK.test(text)) continue

    if (beat !== undefined) {
      const continuesParagraph =
        beat.end === index && !BLOCK_START.test(text) && !THEMATIC_BREAK.test(text)
      if (INDENTED.test(text) || continuesParagraph) {
        beat.end = index + 1
        const opening = FENCE.exec(text)?.[2]
        if (opening !== undefined) fence = { marker: opening, inNotes: true }
        continue
      }
      closeBeat()
    }

    const opening = FENCE.exec(text)?.[2]
    if (opening !== undefined) {
      fence = { marker: opening, inNotes: false }
      continue
    }
    if (HTML_BLOCK.test(text)) {
      html = true
      continue
    }
    const heading = COLUMN.exec(text)
    if (heading !== null) {
      columns.push({ line: index, title: columnTitle(heading[1] ?? ''), beats: [] })
      continue
    }
    const bullet = BULLET.exec(text)
    if (bullet !== null && columns.length > 0 && !THEMATIC_BREAK.test(text)) {
      const marker = bullet[1] as OutlineBeat['marker']
      beat = { line: index, marker, title: (bullet[2] ?? '').trimEnd(), end: index + 1 }
    }
  }
  closeBeat()

  return {
    lines,
    preamble: { start: 0, end: columns[0]?.line ?? lines.length },
    columns: columns.map((column, index) => ({
      ...column,
      lines: { start: column.line, end: columns[index + 1]?.line ?? lines.length }
    }))
  }
}

function columnTitle(raw: string): string {
  return raw.replace(CLOSING_HASHES, '').trim()
}

function toBeat(
  line: number,
  marker: OutlineBeat['marker'],
  title: string,
  end: number
): OutlineBeat {
  const skipped: TextRange[] = [
    ...codeRanges(title),
    ...spans(title, WIKI_LINK_SPAN),
    ...spans(title, MARKDOWN_LINK)
  ]
  const markdownLinks = spans(title, MARKDOWN_LINK)
    .filter(([start]) => !insideAny(codeRanges(title), start))
    .map(([start, stop]) => title.slice(start, stop))
  const tags = [...title.matchAll(TAG)]
    .filter((match) => !insideAny(skipped, match.index + (match[1] ?? '').length))
    .map((match) => match[2] ?? '')
  return {
    line,
    marker,
    title,
    lines: { start: line, end },
    notes: { start: line + 1, end },
    wikiLinks: findWikiLinks(title, { skipCode: true }),
    markdownLinks,
    tags
  }
}

function spans(text: string, pattern: RegExp): TextRange[] {
  return [...text.matchAll(pattern)].map((match) => [match.index, match.index + match[0].length])
}
