import { err, ok, type Result } from '../../../shared-kernel/result'
import { readOutlineStructure } from './outline-structure'
import {
  findBeat,
  invalidTitle,
  oneLineTitle,
  shapeChanged,
  spliceLines,
  type OutlineEditError,
  type OutlineItemRef
} from './splice-lines'

/** Replaces a beat's title, keeping its marker, the spacing after it, its notes and its line break. */
export function retitleBeat(
  body: string,
  beatRef: OutlineItemRef,
  title: string
): Result<string, OutlineEditError> {
  const text = oneLineTitle(title)
  if (text === undefined) return err(invalidTitle())
  const structure = readOutlineStructure(body)
  const { lines } = structure
  const found = findBeat(structure, beatRef)
  const line = found === undefined ? undefined : lines[found.beat.line]
  if (found === undefined || line === undefined) return err(shapeChanged())
  if (text === found.beat.title) return ok(body)

  const prefix = /^[-*+][ \t]+/u.exec(line.text)?.[0] ?? `${found.beat.marker} `
  const written = spliceLines(
    lines,
    { start: found.beat.line, end: found.beat.line + 1 },
    [{ ...line, text: prefix + text }],
    found.beat.line
  )
  return findBeat(readOutlineStructure(written), { line: found.beat.line, title: text }) ===
    undefined
    ? err(invalidTitle())
    : ok(written)
}
