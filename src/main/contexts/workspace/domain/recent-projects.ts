import type { ProjectRoot } from './project-root'

/** How many projects the recents list keeps. */
export const MAX_RECENT_PROJECTS = 10

/** A project the writer opened before, stored in userData (never in the project folder). */
export interface RecentProject {
  readonly root: ProjectRoot
  readonly title: string
  /** ISO 8601 timestamp. */
  readonly lastOpenedAt: string
}

/**
 * Whether two roots are the same folder. Passed in because it depends on the OS: Windows paths
 * compare without case, Linux paths exactly.
 */
export type SameRoot = (a: ProjectRoot, b: ProjectRoot) => boolean

/** The list after opening `entry`: it moves to the top, and the oldest entry drops off when full. */
export function recordOpened(
  list: readonly RecentProject[],
  entry: RecentProject,
  sameRoot: SameRoot
): readonly RecentProject[] {
  const others = list.filter((existing) => !sameRoot(existing.root, entry.root))
  return [entry, ...others].slice(0, MAX_RECENT_PROJECTS)
}

/** The list without `root`. */
export function removeRecent(
  list: readonly RecentProject[],
  root: ProjectRoot,
  sameRoot: SameRoot
): readonly RecentProject[] {
  return list.filter((existing) => !sameRoot(existing.root, root))
}
