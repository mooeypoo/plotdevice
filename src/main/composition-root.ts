import { app } from 'electron'
import { createSaveEntryText } from './contexts/manuscript/application/commands/save-entry-text'
import { createGetManuscript } from './contexts/manuscript/application/queries/get-manuscript'
import { createOpenEntry } from './contexts/manuscript/application/queries/open-entry'
import { createMarkdownManuscriptRepository } from './contexts/manuscript/infrastructure/markdown-manuscript-repository'
import { createInitializeProject } from './contexts/workspace/application/commands/initialize-project'
import { createOpenProject } from './contexts/workspace/application/commands/open-project'
import { createRemoveRecentProject } from './contexts/workspace/application/commands/remove-recent-project'
import { createInspectFolder } from './contexts/workspace/application/queries/inspect-folder'
import { createListRecentProjects } from './contexts/workspace/application/queries/list-recent-projects'
import { createJsonRecentProjectsStore } from './contexts/workspace/infrastructure/json-recent-projects-store'
import { createMarkdownNovelFileStore } from './contexts/workspace/infrastructure/markdown-novel-file-store'
import { createNodeProjectFolders } from './contexts/workspace/infrastructure/node-project-folders'
import { projectRootFromOsPath } from './contexts/workspace/infrastructure/project-root-from-os-path'
import { systemClock } from './contexts/workspace/infrastructure/system-clock'
import { scanProject } from './infrastructure/project-scan/scan-project'
import { createManuscriptHandlers, type ManuscriptUseCases } from './ipc/manuscript-handlers'
import { registerManuscriptIpc } from './ipc/manuscript-ipc'
import { createProjectSession } from './ipc/project-session'
import { createWorkspaceHandlers } from './ipc/workspace-handlers'
import { registerWorkspaceIpc } from './ipc/workspace-ipc'

/**
 * Wires concrete adapters into use cases and registers IPC handlers. It is the only module allowed
 * to import infrastructure adapters.
 */
export function composeApplication(): void {
  const folders = createNodeProjectFolders()
  const novelFiles = createMarkdownNovelFileStore()
  const recents = createJsonRecentProjectsStore(app.getPath('userData'))
  const openProject = createOpenProject({
    folders,
    novelFiles,
    scanner: { scan: scanProject },
    recents,
    clock: systemClock
  })

  const session = createProjectSession((root, readOnly): ManuscriptUseCases => {
    const repository = createMarkdownManuscriptRepository(root)
    return {
      getManuscript: createGetManuscript({ repository }),
      openEntry: createOpenEntry({ repository }),
      saveEntryText: createSaveEntryText({ repository, readOnly })
    }
  })

  registerWorkspaceIpc(
    createWorkspaceHandlers({
      inspectFolder: createInspectFolder({ folders, novelFiles }),
      openProject,
      initializeProject: createInitializeProject({ folders, novelFiles, openProject }),
      listRecentProjects: createListRecentProjects({ folders, recents }),
      removeRecentProject: createRemoveRecentProject({ folders, recents }),
      toProjectRoot: projectRootFromOsPath,
      rootKey: (root) => (process.platform === 'win32' ? root.toLowerCase() : root),
      onProjectOpened: (root, readOnly) => {
        session.open(root, readOnly)
      },
      onProjectClosed: () => {
        session.close()
      }
    })
  )
  registerManuscriptIpc(createManuscriptHandlers(() => session.current()))
}
