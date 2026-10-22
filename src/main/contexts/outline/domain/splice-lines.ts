import { domainError, type DomainError } from '../../../shared-kernel/domain-error'
import { dominantEnding, joinOutlineLines, type OutlineLine } from './outline-lines'
import type { LineRange, OutlineBeat, OutlineColumn, OutlineStructure } from './outline-structure'

/** Why an outline edit was refused. The text is unchanged. */
export type OutlineEditError = DomainError<
  'outline-shape-changed' | 'invalid-title' | 'invalid-notes'
>

/**
 * A beat or column as the board last saw it: the line it starts on and its title. An edit refuses
 * when the outline no longer has that title on that line.
 */
export interface OutlineItemRef {
  readonly line: number
  readonly title: string
}

/** Where a moved or added item goes: before another item, or at the end. */
export type OutlinePlacement = { readonly before: OutlineItemRef } | 'end'

export const shapeChanged = (): OutlineEditError =>
  domainError('outline-shape-changed', 'The outline changed since the board read it.')

export const invalidTitle = (): OutlineEditError =>
  domainError('invalid-title', 'A title is one line of text.')

export function findColumn(
  structure: OutlineStructure,
  ref: OutlineItemRef
): OutlineColumn | undefined {
  return structure.columns.find((column) => column.line === ref.line && column.title === ref.title)
}

export function findBeat(
  structure: OutlineStructure,
  ref: OutlineItemRef
): { readonly column: OutlineColumn; readonly beat: OutlineBeat } | undefined {
  for (const column of structure.columns) {
    const beat = column.beats.find((item) => item.line === ref.line && item.title === ref.title)
    if (beat !== undefined) return { column, beat }
  }
  return undefined
}

export const isBlank = (line: OutlineLine | undefined): boolean =>
  line !== undefined && /^[ \t]*$/u.test(line.text)

/** The line after the last non-blank line in `range`: where something added at its end goes. */
export function endOfContent(lines: readonly OutlineLine[], range: LineRange): number {
  let end = range.end
  while (end > range.start + 1 && isBlank(lines[end - 1])) end -= 1
  return end
}

/** The blank lines from `start` up to the next non-blank line or `limit`. */
export function blanksFrom(lines: readonly OutlineLine[], start: number, limit: number): LineRange {
  let end = start
  while (end < limit && isBlank(lines[end])) end += 1
  return { start, end }
}

/** The blank lines just before `end`, back to the previous non-blank line or `floor`. */
export function blanksBefore(lines: readonly OutlineLine[], end: number, floor: number): LineRange {
  let start = end
  while (start > floor && isBlank(lines[start - 1])) start -= 1
  return { start, end }
}

/** A title the writer typed, as it will be written, or `undefined` if it isn't one line of text. */
export function oneLineTitle(title: string): string | undefined {
  const trimmed = title.trim()
  return trimmed === '' || /[\r\n]/u.test(trimmed) ? undefined : trimmed
}

/** The marker most of a column's beats use, so an added beat matches them. */
export function columnMarker(column: OutlineColumn | undefined): OutlineBeat['marker'] {
  const counts = new Map<OutlineBeat['marker'], number>()
  for (const beat of column?.beats ?? [])
    counts.set(beat.marker, (counts.get(beat.marker) ?? 0) + 1)
  let best: OutlineBeat['marker'] = '-'
  for (const [marker, count] of counts) if (count > (counts.get(best) ?? 0)) best = marker
  return best
}

/**
 * Builds the new body: `removed` lines are left out, and `inserted` lines go in before line
 * `target` (an index into the original lines, outside `removed`; `lines.length` for the end).
 * Every line keeps its own ending, except that a line without one gets the file's line break
 * when something now follows it.
 */
export function spliceLines(
  lines: readonly OutlineLine[],
  removed: LineRange,
  inserted: readonly OutlineLine[],
  target: number
): string {
  const result: OutlineLine[] = []
  for (let index = 0; index <= lines.length; index += 1) {
    if (index === target) result.push(...inserted)
    const line = lines[index]
    if (line !== undefined && (index < removed.start || index >= removed.end)) result.push(line)
  }
  const ending = dominantEnding(lines)
  return joinOutlineLines(
    result.map((line, index) =>
      line.ending === '' && index < result.length - 1 ? { ...line, ending } : line
    )
  )
}

/** A line the app writes, ending with the file's own line break. */
export function newLine(lines: readonly OutlineLine[], text: string): OutlineLine {
  return { text, ending: dominantEnding(lines) }
}
