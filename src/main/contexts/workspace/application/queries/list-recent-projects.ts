import type { ProjectFolders } from '../../domain/ports/project-folders'
import type { RecentProjectsStore } from '../../domain/ports/recent-projects-store'
import type { RecentProject } from '../../domain/recent-projects'

/** A recents entry, with whether its folder still exists. */
export interface RecentProjectListing extends RecentProject {
  readonly available: boolean
}

/** The recents list, most recent first. */
export type ListRecentProjects = () => Promise<readonly RecentProjectListing[]>

/** Builds the `ListRecentProjects` query. */
export function createListRecentProjects(ports: {
  readonly folders: ProjectFolders
  readonly recents: RecentProjectsStore
}): ListRecentProjects {
  return async () => {
    const recents = await ports.recents.load()
    return Promise.all(
      recents.map(async (entry) => ({
        ...entry,
        available: await ports.folders.exists(entry.root)
      }))
    )
  }
}
