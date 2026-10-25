/** A replacement of `text.slice(start, end)`. Offsets are UTF-16 code units (ADR 0003). */
export interface Splice {
  start: number
  end: number
  text: string
}

/** Applies splices from the end so earlier offsets stay valid; at equal offsets, removals go first. */
export function applySplices(text: string, splices: readonly Splice[]): string {
  const ordered = [...splices].sort((a, b) => b.start - a.start || b.end - b.start - (a.end - a.start))
  return ordered.reduce((result, s) => result.slice(0, s.start) + s.text + result.slice(s.end), text)
}

/** The ending a file mostly uses, for lines the app adds. New files use LF. */
export function lineEndingOf(text: string): '\n' | '\r\n' {
  const crlf = text.split('\r\n').length - 1
  const lf = text.split('\n').length - 1 - crlf
  return crlf > lf ? '\r\n' : '\n'
}

export function lineStartAt(text: string, offset: number): number {
  return text.lastIndexOf('\n', offset - 1) + 1
}

/** Offset just past the line ending of the line containing `offset`, or the end of the text. */
export function lineEndAt(text: string, offset: number): number {
  const newline = text.indexOf('\n', offset)
  return newline === -1 ? text.length : newline + 1
}

export function isBlankLineAt(text: string, lineStart: number): boolean {
  return /^[ \t]*\r?$/.test(text.slice(lineStart, lineEndAt(text, lineStart)).replace(/\n$/, ''))
}

/** Start of the run of blank lines ending exactly at `lineStart` (or `lineStart` itself if none). */
export function blankRunBefore(text: string, lineStart: number): number {
  let start = lineStart
  while (start > 0 && isBlankLineAt(text, lineStartAt(text, start - 1))) start = lineStartAt(text, start - 1)
  return start
}

/** End of the last non-blank line in `[start, end)`, including its line ending. */
export function contentEndWithin(text: string, start: number, end: number): number {
  let at = end
  while (at > start && isBlankLineAt(text, lineStartAt(text, at - 1))) at = lineStartAt(text, at - 1)
  return at
}

/** Lines with their own line endings, so CRLF and LF survive edits untouched. */
export function splitKeepingEndings(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? []
}

const TAB_STOP = 4

/** The column a run of spaces and tabs reaches, with tab stops every four columns as in CommonMark. */
export function indentColumns(whitespace: string): number {
  let column = 0
  for (const char of whitespace) column = char === '\t' ? column + TAB_STOP - (column % TAB_STOP) : column + 1
  return column
}
