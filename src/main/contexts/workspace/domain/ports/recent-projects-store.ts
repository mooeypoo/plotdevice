import type { RecentProject } from '../recent-projects'

/** Keeps the recents list in the user's settings folder. */
export interface RecentProjectsStore {
  /** The saved list, or an empty one if there is none or it can't be read. */
  load(): Promise<readonly RecentProject[]>
  save(list: readonly RecentProject[]): Promise<void>
}
