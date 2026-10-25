import type { ProjectView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'

type Contents = ProjectView['contents']

/** Where a chapter goes: a part (its position among all entries, before the move) or the top level, and its index among the others there. */
export interface Placement {
  part: number | null
  index: number
}

export type MoveTarget = { kind: 'start' | 'end'; placement: Placement } | { kind: 'part'; name: string; placement: Placement }

function locate(contents: Contents, file: ProjectPath): { part: number | null; index: number } | null {
  for (const [i, entry] of contents.entries()) {
    if (entry.kind === 'chapter' && entry.file === file) return { part: null, index: i }
    if (entry.kind === 'part') {
      const index = entry.chapters.findIndex((chapter) => chapter.file === file)
      if (index >= 0) return { part: i, index }
    }
  }
  return null
}

/** One step earlier in reading order: within its part, out of the part's start, or into the end of the part above. */
export function moveUp(contents: Contents, file: ProjectPath): Placement | null {
  const at = locate(contents, file)
  if (!at) return null
  if (at.part !== null) return at.index > 0 ? { part: at.part, index: at.index - 1 } : { part: null, index: at.part }
  const before = contents[at.index - 1]
  if (!before) return null
  return before.kind === 'part' ? { part: at.index - 1, index: before.chapters.length } : { part: null, index: at.index - 1 }
}

/** One step later in reading order: within its part, out of the part's end, or into the start of the part below. */
export function moveDown(contents: Contents, file: ProjectPath): Placement | null {
  const at = locate(contents, file)
  if (!at) return null
  if (at.part !== null) {
    const part = contents[at.part]
    const last = part?.kind === 'part' ? part.chapters.length - 1 : 0
    return at.index < last ? { part: at.part, index: at.index + 1 } : { part: null, index: at.part + 1 }
  }
  const after = contents[at.index + 1]
  if (!after) return null
  return after.kind === 'part' ? { part: at.index + 1, index: 0 } : { part: null, index: at.index + 1 }
}

/** The "Move to…" menu: the start of the book, the end of each other part, and the end of the book. */
export function moveTargets(contents: Contents, file: ProjectPath): MoveTarget[] {
  const at = locate(contents, file)
  if (!at) return []
  const topLevelOthers = at.part === null ? contents.length - 1 : contents.length
  const targets: MoveTarget[] = []
  if (!(at.part === null && at.index === 0)) targets.push({ kind: 'start', placement: { part: null, index: 0 } })
  for (const [i, entry] of contents.entries()) {
    if (entry.kind === 'part' && i !== at.part) targets.push({ kind: 'part', name: entry.name, placement: { part: i, index: entry.chapters.length } })
  }
  if (!(at.part === null && at.index === contents.length - 1)) targets.push({ kind: 'end', placement: { part: null, index: topLevelOthers } })
  return targets
}

/** Where a new chapter goes: right after `file` when it is in the book, otherwise at the end. */
export function placementAfter(contents: Contents, file: ProjectPath | null): Placement {
  const at = file ? locate(contents, file) : null
  if (!at) return { part: null, index: contents.length }
  return { part: at.part, index: at.index + 1 }
}
