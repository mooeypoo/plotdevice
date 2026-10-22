import { err, ok, type Result } from '../../../shared-kernel/result'
import { readOutlineStructure } from './outline-structure'
import {
  columnMarker,
  endOfContent,
  findBeat,
  findColumn,
  invalidTitle,
  newLine,
  oneLineTitle,
  shapeChanged,
  spliceLines,
  type OutlineEditError,
  type OutlineItemRef,
  type OutlinePlacement
} from './splice-lines'

/** Adds a beat to a column, before one of its beats or after its last line, in the column's marker. */
export function addBeat(
  body: string,
  columnRef: OutlineItemRef,
  title: string,
  placement: OutlinePlacement
): Result<string, OutlineEditError> {
  const text = oneLineTitle(title)
  if (text === undefined) return err(invalidTitle())
  const structure = readOutlineStructure(body)
  const { lines } = structure
  const column = findColumn(structure, columnRef)
  if (column === undefined) return err(shapeChanged())

  let target: number
  if (placement === 'end') target = endOfContent(lines, column.lines)
  else {
    const before = findBeat(structure, placement.before)
    if (before?.column !== column) return err(shapeChanged())
    target = before.beat.line
  }

  const written = spliceLines(
    lines,
    { start: target, end: target },
    [newLine(lines, `${columnMarker(column)} ${text}`)],
    target
  )
  // A title such as `---` would turn the line into something other than a beat.
  return findBeat(readOutlineStructure(written), { line: target, title: text }) === undefined
    ? err(invalidTitle())
    : ok(written)
}
