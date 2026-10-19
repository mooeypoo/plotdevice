import type { ProjectPath } from '../../../shared-kernel/project-path'

/** An entry and its current `order`, if any. */
export interface Ordered {
  readonly path: ProjectPath
  readonly order?: number
}

/** One `order` to write. */
export interface OrderChange {
  readonly path: ProjectPath
  readonly order: number
}

/**
 * The writes that give `sequence` the orders 1, 2, 3…, only for entries whose order differs, so a
 * reorder touches as few files as possible.
 */
export function orderChanges(sequence: readonly Ordered[]): OrderChange[] {
  return sequence.flatMap((entry, index) =>
    entry.order === index + 1 ? [] : [{ path: entry.path, order: index + 1 }]
  )
}

/** `sequence` with `moved` taken out and put back at `index` (clamped to the ends). */
export function placeAt<T extends Ordered>(sequence: readonly T[], moved: T, index: number): T[] {
  const others = sequence.filter((entry) => entry.path !== moved.path)
  const at = Math.max(0, Math.min(index, others.length))
  return [...others.slice(0, at), moved, ...others.slice(at)]
}

/** Whether `requested` lists exactly the paths of `current`, in any order. */
export function samePaths(current: readonly Ordered[], requested: readonly ProjectPath[]): boolean {
  if (current.length !== requested.length) return false
  const paths = new Set<string>(current.map((entry) => entry.path))
  return requested.every((path) => paths.has(path)) && new Set(requested).size === requested.length
}
