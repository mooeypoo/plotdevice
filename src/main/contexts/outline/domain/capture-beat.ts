import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'
import { err, ok, type Result } from '../../../shared-kernel/result'
import type { OutlineWords } from './outline-settings'
import { readOutlineStructure } from './outline-structure'
import {
  columnMarker,
  endOfContent,
  invalidTitle,
  isBlank,
  newLine,
  oneLineTitle,
  spliceLines,
  type OutlineEditError
} from './splice-lines'

/**
 * Captures a beat at the end of the Inbox column: the first column titled with any accepted
 * spelling of the Inbox word. Without one, adds the heading in the book's spelling at the end of
 * the outline (ADR 0019, 0020). Existing beats are never touched.
 */
export function captureBeat(
  body: string,
  inbox: OutlineWords['inbox'],
  title: string
): Result<string, OutlineEditError> {
  const text = oneLineTitle(title)
  if (text === undefined) return err(invalidTitle())
  const structure = readOutlineStructure(body)
  const { lines } = structure
  const accepted = new Set(inbox.recognize.map(nameComparisonKey))
  const column = structure.columns.find((item) => accepted.has(nameComparisonKey(item.title)))

  if (column !== undefined) {
    const target = endOfContent(lines, column.lines)
    const beat = newLine(lines, `${columnMarker(column)} ${text}`)
    return verified(spliceLines(lines, { start: target, end: target }, [beat], target), text)
  }
  const separator = lines.length > 0 && !isBlank(lines.at(-1)) ? [newLine(lines, '')] : []
  const added = [...separator, newLine(lines, `## ${inbox.write}`), newLine(lines, `- ${text}`)]
  return verified(
    spliceLines(lines, { start: lines.length, end: lines.length }, added, lines.length),
    text
  )
}

function verified(body: string, title: string): Result<string, OutlineEditError> {
  const captured = readOutlineStructure(body).columns.some((column) =>
    column.beats.some((beat) => beat.title === title)
  )
  return captured ? ok(body) : err(invalidTitle())
}
