import type { ProjectFolders } from '../../domain/ports/project-folders'
import type {
  RecentProjectsError,
  RecentProjectsStore
} from '../../domain/ports/recent-projects-store'
import type { RecentProject } from '../../domain/recent-projects'
import { ok, type Result } from '../../../../shared-kernel/result'

/** A recents entry, with whether its folder still exists. */
export interface RecentProjectListing extends RecentProject {
  readonly available: boolean
}

/** The recents list, most recent first. */
export type ListRecentProjects = () => Promise<
  Result<readonly RecentProjectListing[], RecentProjectsError>
>

/** Builds the `ListRecentProjects` query. */
export function createListRecentProjects(ports: {
  readonly folders: ProjectFolders
  readonly recents: RecentProjectsStore
}): ListRecentProjects {
  return async () => {
    const recents = await ports.recents.load()
    if (!recents.ok) return recents
    return ok(
      await Promise.all(
        recents.value.map(async (entry) => ({
          ...entry,
          available: await ports.folders.exists(entry.root)
        }))
      )
    )
  }
}
