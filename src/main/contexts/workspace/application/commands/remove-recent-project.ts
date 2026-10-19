import type { ProjectFolders } from '../../domain/ports/project-folders'
import type { RecentProjectsStore } from '../../domain/ports/recent-projects-store'
import type { ProjectRoot } from '../../domain/project-root'
import { removeRecent } from '../../domain/recent-projects'

/** Removes a project from the recents list. The folder itself is not touched. */
export type RemoveRecentProject = (root: ProjectRoot) => Promise<void>

/** Builds the `RemoveRecentProject` use case. */
export function createRemoveRecentProject(ports: {
  readonly folders: ProjectFolders
  readonly recents: RecentProjectsStore
}): RemoveRecentProject {
  return async (root) => {
    const recents = await ports.recents.load()
    await ports.recents.save(removeRecent(recents, root, ports.folders.isSameRoot))
  }
}
