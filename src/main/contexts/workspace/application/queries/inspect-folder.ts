import type { NovelFileStore } from '../../domain/ports/novel-file-store'
import type { ProjectFolders } from '../../domain/ports/project-folders'
import { readProject } from '../../domain/project'
import type { ProjectRoot } from '../../domain/project-root'

/** What a chosen folder is, so the app can offer the right next step. */
export interface FolderInspection {
  readonly root: ProjectRoot
  readonly name: string
  readonly isProject: boolean
  /** The project this folder is inside, if any; the app offers to open it instead. */
  readonly projectAbove?: { readonly root: ProjectRoot; readonly title: string }
  /** A project inside this folder, if any; this folder can't be initialized. */
  readonly projectBelow?: ProjectRoot
}

/** Tells whether a folder is a project, is inside one, or contains one. */
export type InspectFolder = (root: ProjectRoot) => Promise<FolderInspection>

/** Builds the `InspectFolder` query. */
export function createInspectFolder(ports: {
  readonly folders: ProjectFolders
  readonly novelFiles: NovelFileStore
}): InspectFolder {
  return async (root) => {
    const name = ports.folders.nameOf(root)
    if ((await ports.novelFiles.read(root)).kind !== 'missing') {
      return { root, name, isProject: true }
    }

    const aboveRoot = await ports.folders.findProjectAbove(root)
    if (aboveRoot !== undefined) {
      const aboveNovel = await ports.novelFiles.read(aboveRoot)
      const aboveName = ports.folders.nameOf(aboveRoot)
      const title =
        aboveNovel.kind === 'read'
          ? readProject(aboveRoot, aboveName, aboveNovel.frontmatter).title
          : aboveName
      return { root, name, isProject: false, projectAbove: { root: aboveRoot, title } }
    }

    const projectBelow = await ports.folders.findProjectBelow(root)
    return { root, name, isProject: false, ...(projectBelow !== undefined ? { projectBelow } : {}) }
  }
}
