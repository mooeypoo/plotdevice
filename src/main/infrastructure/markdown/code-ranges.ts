/** A span of text, as `[start, end)` offsets. */
export type TextRange = readonly [number, number]

const FENCE = /^ {0,3}(`{3,}|~{3,})/u

/**
 * Where code is in markdown text: fenced blocks (``` or ~~~) and inline code spans. Links inside
 * code are text, not links (see "Links" in docs/file-format.md).
 */
export function codeRanges(text: string): TextRange[] {
  const ranges: TextRange[] = []
  let lineStart = 0
  let fence: { readonly marker: string; readonly start: number } | undefined
  const inlineCandidates: TextRange[] = []

  while (lineStart <= text.length) {
    const newline = text.indexOf('\n', lineStart)
    const lineEnd = newline === -1 ? text.length : newline + 1
    const line = text.slice(lineStart, lineEnd)
    const opening = FENCE.exec(line)?.[1]

    if (fence !== undefined) {
      const closing = FENCE.exec(line)?.[1]
      if (
        closing !== undefined &&
        closing[0] === fence.marker[0] &&
        closing.length >= fence.marker.length
      ) {
        ranges.push([fence.start, lineEnd])
        fence = undefined
      }
    } else if (opening !== undefined) {
      fence = { marker: opening, start: lineStart }
    } else {
      inlineCandidates.push([lineStart, lineEnd])
    }
    if (newline === -1) break
    lineStart = lineEnd
  }
  if (fence !== undefined) ranges.push([fence.start, text.length])

  for (const [start, end] of inlineCandidates) ranges.push(...inlineCode(text, start, end))
  return ranges.sort((a, b) => a[0] - b[0])
}

/** Inline code spans on one line: a run of backticks closed by a run of the same length. */
function inlineCode(text: string, start: number, end: number): TextRange[] {
  const ranges: TextRange[] = []
  const line = text.slice(start, end)
  const ticks = /`+/gu
  let open: { readonly length: number; readonly at: number } | undefined
  for (const match of line.matchAll(ticks)) {
    if (open === undefined) open = { length: match[0].length, at: match.index }
    else if (match[0].length === open.length) {
      ranges.push([start + open.at, start + match.index + match[0].length])
      open = undefined
    }
  }
  return ranges
}

/** Whether `position` falls inside any of the ranges. */
export function insideAny(ranges: readonly TextRange[], position: number): boolean {
  return ranges.some(([start, end]) => position >= start && position < end)
}
