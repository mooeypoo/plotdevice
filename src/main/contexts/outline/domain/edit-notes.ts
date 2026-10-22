import { domainError } from '../../../shared-kernel/domain-error'
import { err, ok, type Result } from '../../../shared-kernel/result'
import { readOutlineStructure } from './outline-structure'
import {
  findBeat,
  isBlank,
  newLine,
  shapeChanged,
  spliceLines,
  type OutlineEditError,
  type OutlineItemRef
} from './splice-lines'

/**
 * Replaces a beat's notes with the writer's text, indented the way its notes already are (or to
 * line up under the title), so every line stays part of the beat. Empty text removes the notes.
 */
export function editNotes(
  body: string,
  beatRef: OutlineItemRef,
  notes: string
): Result<string, OutlineEditError> {
  const structure = readOutlineStructure(body)
  const { lines } = structure
  const found = findBeat(structure, beatRef)
  const titleLine = found === undefined ? undefined : lines[found.beat.line]
  if (found === undefined || titleLine === undefined) return err(shapeChanged())
  const { beat } = found

  const existing = lines.slice(beat.notes.start, beat.notes.end).find((line) => !isBlank(line))
  const indent =
    /^[ \t]+/u.exec(existing?.text ?? '')?.[0] ??
    ' '.repeat(/^[-*+][ \t]+/u.exec(titleLine.text)?.[0].length ?? 2)
  const written = notes.replace(/\r\n/gu, '\n').split('\n')
  while (written.length > 0 && written.at(-1)?.trim() === '') written.pop()
  const inserted = written.map((text) => newLine(lines, text.trim() === '' ? '' : indent + text))
  const result = spliceLines(lines, beat.notes, inserted, beat.notes.start)

  const reread = findBeat(readOutlineStructure(result), beatRef)?.beat
  if (reread?.notes.end !== beat.notes.start + inserted.length) {
    return err(
      domainError('invalid-notes', 'These notes would change the outline around them.', {
        reason: 'outline-invalid-notes'
      })
    )
  }
  return ok(result)
}
