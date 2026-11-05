import type { ProjectPath } from '@plotdevice/shared'

/**
 * The book's main outline (ADR 0012), whose sections name the timeline's columns: the one `project.md`
 * names, or else the first outline in the list. Nothing is written to settle it; the app writes
 * `mainOutline` only when the author acts (a new book, a new outline, choosing another, deleting it).
 */
export function mainOutlineOf(named: ProjectPath | null, outlines: readonly ProjectPath[]): ProjectPath | null {
  if (named !== null && outlines.includes(named)) return named
  return outlines[0] ?? null
}

/**
 * What to write as `mainOutline` before an outline is added: the current main, when `project.md`
 * doesn't name it yet, so the new outline doesn't take over by coming first in the list; `null` when
 * nothing needs writing.
 */
export function mainOutlineToKeep(named: ProjectPath | null, outlines: readonly ProjectPath[]): ProjectPath | null {
  return named !== null && outlines.includes(named) ? null : (outlines[0] ?? null)
}
