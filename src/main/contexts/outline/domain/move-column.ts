import { err, ok, type Result } from '../../../shared-kernel/result'
import { readOutlineStructure, type LineRange } from './outline-structure'
import {
  blanksBefore,
  endOfContent,
  findColumn,
  shapeChanged,
  spliceLines,
  type OutlineEditError,
  type OutlineItemRef,
  type OutlinePlacement
} from './splice-lines'

/**
 * Moves a column, from its heading to the next `##`, before another column or after the last
 * (ADR 0020). The blank lines that separated it travel with it; the preamble never moves.
 */
export function moveColumn(
  body: string,
  columnRef: OutlineItemRef,
  placement: OutlinePlacement
): Result<string, OutlineEditError> {
  const structure = readOutlineStructure(body)
  const { lines, columns } = structure
  const column = findColumn(structure, columnRef)
  if (column === undefined) return err(shapeChanged())

  let target: number
  if (placement === 'end') target = endOfContent(lines, { start: 0, end: lines.length })
  else {
    const before = findColumn(structure, placement.before)
    if (before === undefined) return err(shapeChanged())
    target = before.line
  }

  const content = { start: column.line, end: endOfContent(lines, column.lines) }
  const index = columns.indexOf(column)
  const previous = columns[index - 1]
  let gap: LineRange = { start: content.end, end: content.end }
  if (index < columns.length - 1) gap = { start: content.end, end: column.lines.end }
  else if (previous !== undefined) {
    gap = blanksBefore(lines, column.line, endOfContent(lines, previous.lines))
  }
  const removed = {
    start: Math.min(gap.start, content.start),
    end: Math.max(gap.end, content.end)
  }
  if (target >= removed.start && target <= removed.end) return ok(body)

  const block = lines.slice(content.start, content.end)
  const gapLines = lines.slice(gap.start, gap.end)
  const inserted = placement === 'end' ? [...gapLines, ...block] : [...block, ...gapLines]
  return ok(spliceLines(lines, removed, inserted, target))
}
