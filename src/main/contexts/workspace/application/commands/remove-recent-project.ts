import type { ProjectFolders } from '../../domain/ports/project-folders'
import type {
  RecentProjectsError,
  RecentProjectsStore
} from '../../domain/ports/recent-projects-store'
import type { ProjectRoot } from '../../domain/project-root'
import { removeRecent } from '../../domain/recent-projects'
import type { Result } from '../../../../shared-kernel/result'

/** Removes a project from the recents list. The folder itself is not touched. */
export type RemoveRecentProject = (root: ProjectRoot) => Promise<Result<void, RecentProjectsError>>

/** Builds the `RemoveRecentProject` use case. */
export function createRemoveRecentProject(ports: {
  readonly folders: ProjectFolders
  readonly recents: RecentProjectsStore
}): RemoveRecentProject {
  return async (root) => {
    const recents = await ports.recents.load()
    if (!recents.ok) return recents
    return ports.recents.save(removeRecent(recents.value, root, ports.folders.isSameRoot))
  }
}
