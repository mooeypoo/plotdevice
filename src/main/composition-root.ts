import { app } from 'electron'
import { createCheckStoryDate } from './contexts/chronology/application/queries/check-story-date'
import { createGetChronologySettings } from './contexts/chronology/application/queries/get-chronology-settings'
import { describeStoryDateReading } from './contexts/chronology/domain/story-date'
import { createMarkdownChronologyRepository } from './contexts/chronology/infrastructure/markdown-chronology-repository'
import { createEditTemplate } from './contexts/codex/application/commands/edit-template'
import { createCreateCodexEntry } from './contexts/codex/application/commands/create-codex-entry'
import {
  createPlanCodexRename,
  createRenameCodexEntry
} from './contexts/codex/application/commands/rename-codex-entry'
import { createSaveCodexText } from './contexts/codex/application/commands/save-codex-text'
import { createSetEntryType } from './contexts/codex/application/commands/set-entry-type'
import { createUpdateRelationships } from './contexts/codex/application/commands/update-relationships'
import { createUpdateCodexProperties } from './contexts/codex/application/commands/update-codex-properties'
import { createGetCodexProperties } from './contexts/codex/application/queries/get-codex-properties'
import { createListCodex } from './contexts/codex/application/queries/list-codex'
import { createOpenCodexEntry } from './contexts/codex/application/queries/open-codex-entry'
import type { CodexSettings } from './contexts/codex/domain/codex-settings'
import { createMarkdownCodexRepository } from './contexts/codex/infrastructure/markdown-codex-repository'
import { createListChapterReferences } from './contexts/manuscript/application/queries/list-chapter-references'
import { createCodexHandlers, type CodexUseCases } from './ipc/codex-handlers'
import { registerCodexIpc } from './ipc/codex-ipc'
import { createGetAppearsIn } from './queries/get-appears-in'
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
import { createFixWarning } from './contexts/manuscript/application/commands/fix-warning'
import { createRenumberPart } from './contexts/manuscript/application/commands/renumber-part'
import { createSaveEntryText } from './contexts/manuscript/application/commands/save-entry-text'
import { createUpdateEntryProperties } from './contexts/manuscript/application/commands/update-entry-properties'
import { createGetEntryProperties } from './contexts/manuscript/application/queries/get-entry-properties'
import { createGetManuscript } from './contexts/manuscript/application/queries/get-manuscript'
import { createListStatuses } from './contexts/manuscript/application/queries/list-statuses'
import { createOpenEntry } from './contexts/manuscript/application/queries/open-entry'
import type { ManuscriptSettings } from './contexts/manuscript/domain/manuscript-settings'
import { createMarkdownEntryRelocator } from './infrastructure/links/markdown-entry-relocator'
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
  readonly codex: CodexUseCases
  readonly inspector: InspectorUseCases
}

/** What each context needs to know about the open project. */
interface ProjectContext {
  readonly manuscript: ManuscriptSettings
  readonly codex: CodexSettings
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

  const session = createProjectSession((root, context: ProjectContext): ProjectUseCases => {
    const settings = context.manuscript
    const repository = createMarkdownManuscriptRepository(root)
    const codexRepository = createMarkdownCodexRepository(root)
    const codexSettings = context.codex
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
        fixWarning: createFixWarning({ repository, settings }),
        movePart: createMovePart({ repository, settings }),
        planRename: createPlanRename({ repository, relocator, settings }),
        renameEntry: createRenameEntry({ repository, relocator, settings })
      },
      codex: {
        listCodex: createListCodex({ repository: codexRepository, settings: codexSettings }),
        editTemplate: createEditTemplate({ repository: codexRepository, settings: codexSettings }),
        openEntry: createOpenCodexEntry({ repository: codexRepository }),
        saveEntryText: createSaveCodexText({
          repository: codexRepository,
          readOnly: codexSettings.readOnly
        }),
        getProperties: createGetCodexProperties({ repository: codexRepository }),
        updateProperties: createUpdateCodexProperties({
          repository: codexRepository,
          settings: codexSettings
        }),
        updateRelationships: createUpdateRelationships({
          repository: codexRepository,
          settings: codexSettings
        }),
        createEntry: createCreateCodexEntry({
          repository: codexRepository,
          settings: codexSettings
        }),
        setEntryType: createSetEntryType({ repository: codexRepository, settings: codexSettings }),
        planRename: createPlanCodexRename({
          repository: codexRepository,
          relocator,
          settings: codexSettings
        }),
        renameEntry: createRenameCodexEntry({
          repository: codexRepository,
          relocator,
          settings: codexSettings
        }),
        getAppearsIn: createGetAppearsIn({
          listChapterReferences: createListChapterReferences({ repository })
        })
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
        const { folders, fileNames } = project.settings
        session.open(root, {
          manuscript: {
            readOnly: project.readOnly,
            partFolder: folderPath(folders.part),
            chapterFolder: folderPath(folders.chapter),
            fileNames
          },
          codex: {
            readOnly: project.readOnly,
            folders: {
              character: folderPath(folders.character),
              location: folderPath(folders.location),
              note: folderPath(folders.note)
            },
            templateFolder: folderPath(folders.template),
            fileNames
          }
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
  registerCodexIpc(createCodexHandlers(() => session.current()?.codex))
  registerInspectorIpc(createInspectorHandlers(() => session.current()?.inspector))
}

function folderPath(folder: string): ProjectPath | undefined {
  const parsed = parseProjectPath(folder)
  return parsed.ok ? parsed.value : undefined
}
