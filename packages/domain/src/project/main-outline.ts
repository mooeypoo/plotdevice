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

/** The outlines in use: all but those set aside, in the same order. */
export function outlinesInUse(outlines: readonly ProjectPath[], setAside: readonly ProjectPath[]): ProjectPath[] {
  return outlines.filter((file) => !setAside.includes(file))
}

export type OutlineRoleChange = { kind: 'set-aside' | 'bring-back' | 'delete'; file: ProjectPath }

/**
 * What `project.md` says after an outline is set aside, brought back or deleted: the outlines set
 * aside, and the main outline, written down so it doesn't change by accident. The main outline stays
 * main while it is in use; otherwise the first outline in use takes over, or none when none is left.
 */
export function outlineRolesAfter(
  current: { mainOutline: ProjectPath | null; setAside: readonly ProjectPath[] },
  outlines: readonly ProjectPath[],
  change: OutlineRoleChange,
): { setAside: ProjectPath[]; mainOutline: ProjectPath | null } {
  const before = mainOutlineOf(current.mainOutline, outlinesInUse(outlines, current.setAside))
  const others = current.setAside.filter((file) => file !== change.file)
  const setAside = change.kind === 'set-aside' ? [...others, change.file] : others
  const inUse = outlinesInUse(
    outlines.filter((file) => change.kind !== 'delete' || file !== change.file),
    setAside,
  )
  return { setAside, mainOutline: mainOutlineOf(before, inUse) }
}
