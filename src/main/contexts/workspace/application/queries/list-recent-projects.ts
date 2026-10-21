import type { ProjectFolders, ProjectFoldersError } from '../../domain/ports/project-folders'
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
  Result<readonly RecentProjectListing[], RecentProjectsError | ProjectFoldersError>
>

/** Builds the `ListRecentProjects` query. */
export function createListRecentProjects(ports: {
  readonly folders: ProjectFolders
  readonly recents: RecentProjectsStore
}): ListRecentProjects {
  return async () => {
    const recents = await ports.recents.load()
    if (!recents.ok) return recents
    const checked = await Promise.all(
      recents.value.map(async (entry) => {
        const exists = await ports.folders.exists(entry.root)
        return exists.ok ? ok({ ...entry, available: exists.value }) : exists
      })
    )
    const listing: RecentProjectListing[] = []
    for (const result of checked) {
      if (!result.ok) return result
      listing.push(result.value)
    }
    return ok(listing)
  }
}
