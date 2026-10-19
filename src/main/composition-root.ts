import { app } from 'electron'
import { createCheckStoryDate } from './contexts/chronology/application/queries/check-story-date'
import { createGetChronologySettings } from './contexts/chronology/application/queries/get-chronology-settings'
import { describeStoryDateReading } from './contexts/chronology/domain/story-date'
import { createMarkdownChronologyRepository } from './contexts/chronology/infrastructure/markdown-chronology-repository'
import { createAddStatus } from './contexts/manuscript/application/commands/add-status'
import {
  createCreateChapter,
  createCreatePart
} from './contexts/manuscript/application/commands/create-entries'
import {
  createMoveChapter,
  createMovePart
} from './contexts/manuscript/application/commands/move-entries'
import {
  createPlanRename,
  createRenameEntry
} from './contexts/manuscript/application/commands/rename-entry'
import { createRenumberPart } from './contexts/manuscript/application/commands/renumber-part'
import { createSaveEntryText } from './contexts/manuscript/application/commands/save-entry-text'
import { createUpdateEntryProperties } from './contexts/manuscript/application/commands/update-entry-properties'
import { createGetEntryProperties } from './contexts/manuscript/application/queries/get-entry-properties'
import { createGetManuscript } from './contexts/manuscript/application/queries/get-manuscript'
import { createListStatuses } from './contexts/manuscript/application/queries/list-statuses'
import { createOpenEntry } from './contexts/manuscript/application/queries/open-entry'
import type { ManuscriptSettings } from './contexts/manuscript/domain/manuscript-settings'
import { createMarkdownEntryRelocator } from './contexts/manuscript/infrastructure/markdown-entry-relocator'
import { createMarkdownManuscriptRepository } from './contexts/manuscript/infrastructure/markdown-manuscript-repository'
import { createInitializeProject } from './contexts/workspace/application/commands/initialize-project'
import {
  createOpenProject,
  createReadProject
} from './contexts/workspace/application/commands/open-project'
import { createRemoveRecentProject } from './contexts/workspace/application/commands/remove-recent-project'
import { createInspectFolder } from './contexts/workspace/application/queries/inspect-folder'
import { createListRecentProjects } from './contexts/workspace/application/queries/list-recent-projects'
import { createJsonRecentProjectsStore } from './contexts/workspace/infrastructure/json-recent-projects-store'
import { createMarkdownNovelFileStore } from './contexts/workspace/infrastructure/markdown-novel-file-store'
import { createNodeProjectFolders } from './contexts/workspace/infrastructure/node-project-folders'
import { projectRootFromOsPath } from './contexts/workspace/infrastructure/project-root-from-os-path'
import { systemClock } from './contexts/workspace/infrastructure/system-clock'
import { scanProject } from './infrastructure/project-scan/scan-project'
import { createGetInspectorVocabulary } from './queries/get-inspector-vocabulary'
import { createInspectorHandlers, type InspectorUseCases } from './ipc/inspector-handlers'
import { registerInspectorIpc } from './ipc/inspector-ipc'
import { createManuscriptHandlers, type ManuscriptUseCases } from './ipc/manuscript-handlers'
import { registerManuscriptIpc } from './ipc/manuscript-ipc'
import { sendProjectChanges } from './ipc/project-events'
import { watchProject, type ProjectWatcher } from './infrastructure/watching/project-watcher'
import { createProjectSession } from './ipc/project-session'
import { createWorkspaceHandlers } from './ipc/workspace-handlers'
import { registerWorkspaceIpc } from './ipc/workspace-ipc'
import { parseProjectPath, type ProjectPath } from './shared-kernel/project-path'

/** The use cases built for each open project. */
interface ProjectUseCases {
  readonly manuscript: ManuscriptUseCases
  readonly inspector: InspectorUseCases
}

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

  // One watcher, for the open project; replaced when another opens.
  let watcher: ProjectWatcher | undefined
  const stopWatching = (): void => {
    void watcher?.close()
    watcher = undefined
  }

  const session = createProjectSession((root, settings: ManuscriptSettings): ProjectUseCases => {
    const repository = createMarkdownManuscriptRepository(root)
    const relocator = createMarkdownEntryRelocator(root)
    const chronology = createMarkdownChronologyRepository(root)
    const getChronologySettings = createGetChronologySettings({ repository: chronology })
    return {
      manuscript: {
        getManuscript: createGetManuscript({ repository }),
        openEntry: createOpenEntry({ repository }),
        saveEntryText: createSaveEntryText({ repository, readOnly: settings.readOnly }),
        getEntryProperties: createGetEntryProperties({ repository }),
        updateEntryProperties: createUpdateEntryProperties({ repository, settings }),
        createChapter: createCreateChapter({ repository, settings }),
        createPart: createCreatePart({ repository, settings }),
        renumberPart: createRenumberPart({ repository, settings }),
        addStatus: createAddStatus({ repository, settings }),
        moveChapter: createMoveChapter({ repository, relocator, settings }),
        movePart: createMovePart({ repository, settings }),
        planRename: createPlanRename({ repository, relocator, settings }),
        renameEntry: createRenameEntry({ repository, relocator, settings })
      },
      inspector: {
        getVocabulary: createGetInspectorVocabulary({
          listStatuses: createListStatuses({ repository }),
          getChronologySettings
        }),
        checkStoryDate: createCheckStoryDate({ getSettings: getChronologySettings }),
        describeStoryDate: describeStoryDateReading
      }
    }
  })

  registerWorkspaceIpc(
    createWorkspaceHandlers({
      inspectFolder: createInspectFolder({ folders, novelFiles }),
      openProject,
      readProject: createReadProject({ folders, novelFiles, scanner: { scan: scanProject } }),
      initializeProject: createInitializeProject({ folders, novelFiles, openProject }),
      listRecentProjects: createListRecentProjects({ folders, recents }),
      removeRecentProject: createRemoveRecentProject({ folders, recents }),
      toProjectRoot: projectRootFromOsPath,
      rootKey: (root) => (process.platform === 'win32' ? root.toLowerCase() : root),
      onProjectOpened: (root, project) => {
        session.open(root, {
          readOnly: project.readOnly,
          partFolder: folderPath(project.settings.folders.part),
          chapterFolder: folderPath(project.settings.folders.chapter),
          fileNames: project.settings.fileNames
        })
        stopWatching()
        watcher = watchProject(root, (changes) => {
          sendProjectChanges(changes.map(({ path, kind }) => ({ path, kind })))
        })
      },
      onProjectClosed: () => {
        stopWatching()
        session.close()
      }
    })
  )
  registerManuscriptIpc(createManuscriptHandlers(() => session.current()?.manuscript))
  registerInspectorIpc(createInspectorHandlers(() => session.current()?.inspector))
}

function folderPath(folder: string): ProjectPath | undefined {
  const parsed = parseProjectPath(folder)
  return parsed.ok ? parsed.value : undefined
}
