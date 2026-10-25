import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'
import { err, ok, type Result } from '../../../shared-kernel/result'
import type { OutlineLine } from './outline-lines'
import { readOutlineStructure } from './outline-structure'
import {
  columnExists,
  findColumn,
  invalidColumn,
  isBlank,
  newLine,
  oneLineTitle,
  shapeChanged,
  spliceLines,
  type OutlineEditError,
  type OutlinePlacement
} from './splice-lines'

/**
 * Adds a column: one `## title` heading, before another column or after the outline's last line,
 * with a blank line around it as the outline's own headings have (D5). Every other line is kept.
 * A name another column already has is refused, so the board never shows two of the same.
 */
export function addColumn(
  body: string,
  title: string,
  placement: OutlinePlacement
): Result<string, OutlineEditError> {
  const text = oneLineTitle(title)
  if (text === undefined) return err(invalidColumn())
  const structure = readOutlineStructure(body)
  const { lines } = structure
  const key = nameComparisonKey(text)
  if (structure.columns.some((column) => nameComparisonKey(column.title) === key))
    return err(columnExists(text))

  let target: number
  if (placement === 'end') {
    target = lines.length
    while (target > 0 && isBlank(lines[target - 1])) target -= 1
  } else {
    const before = findColumn(structure, placement.before)
    if (before === undefined) return err(shapeChanged())
    target = before.line
  }

  const separated = target === 0 || isBlank(lines[target - 1])
  // At the very end, the heading ends the file the way its last line did.
  const lastEnding = target === lines.length ? lines.at(-1)?.ending : undefined
  const heading: OutlineLine =
    lastEnding === '' ? { text: `## ${text}`, ending: '' } : newLine(lines, `## ${text}`)
  const inserted = [
    ...(separated ? [] : [newLine(lines, '')]),
    heading,
    ...(placement === 'end' ? [] : [newLine(lines, '')])
  ]
  const written = spliceLines(lines, { start: target, end: target }, inserted, target)
  // A title such as `#` or `x ##` reads back differently once it is a heading.
  const line = target + (separated ? 0 : 1)
  return findColumn(readOutlineStructure(written), { line, title: text }) === undefined
    ? err(invalidColumn())
    : ok(written)
}
