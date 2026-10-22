import { err, ok, type Result } from '../../../shared-kernel/result'
import { readOutlineStructure, type LineRange } from './outline-structure'
import {
  blanksBefore,
  blanksFrom,
  endOfContent,
  findBeat,
  findColumn,
  shapeChanged,
  spliceLines,
  type OutlineEditError,
  type OutlineItemRef,
  type OutlinePlacement
} from './splice-lines'

/**
 * Moves a beat, with its notes, into a column: before one of its beats or after its last line
 * (ADR 0020). In a list with blank lines between beats, the blank line moves with the beat.
 */
export function moveBeat(
  body: string,
  beatRef: OutlineItemRef,
  columnRef: OutlineItemRef,
  placement: OutlinePlacement
): Result<string, OutlineEditError> {
  const structure = readOutlineStructure(body)
  const { lines } = structure
  const found = findBeat(structure, beatRef)
  const column = findColumn(structure, columnRef)
  if (found === undefined || column === undefined) return err(shapeChanged())

  let target: number
  if (placement === 'end') target = endOfContent(lines, column.lines)
  else {
    const before = findBeat(structure, placement.before)
    if (before?.column !== column) return err(shapeChanged())
    target = before.beat.line
  }

  const { beat } = found
  const beats = found.column.beats
  const index = beats.indexOf(beat)
  const after = blanksFrom(lines, beat.lines.end, found.column.lines.end)
  const previous = beats[index - 1]
  let gap: LineRange = { start: beat.lines.end, end: beat.lines.end }
  if (beats[index + 1]?.line === after.end) gap = after
  else if (previous !== undefined) {
    const before = blanksBefore(lines, beat.lines.start, previous.lines.end)
    if (before.start === previous.lines.end) gap = before
  }
  const removed = {
    start: Math.min(gap.start, beat.lines.start),
    end: Math.max(gap.end, beat.lines.end)
  }
  if (target >= removed.start && target <= removed.end) return ok(body)

  const block = lines.slice(beat.lines.start, beat.lines.end)
  const gapLines = lines.slice(gap.start, gap.end)
  const inserted = placement === 'end' ? [...gapLines, ...block] : [...block, ...gapLines]
  return ok(spliceLines(lines, removed, inserted, target))
}
