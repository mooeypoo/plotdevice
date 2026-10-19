import { contextBridge, ipcRenderer } from 'electron'
import type { PlotDeviceApi } from '../contract/api'
import {
  APP_CHANNELS,
  CODEX_CHANNELS,
  EVENT_CHANNELS,
  INSPECTOR_CHANNELS,
  MANUSCRIPT_CHANNELS,
  WORKSPACE_CHANNELS
} from '../contract/channels'
import type {
  ApiResult,
  AppearanceDto,
  CodexListingDto,
  CodexPropertiesViewDto,
  CreatedEntryDto,
  EntryPropertiesViewDto,
  EntryTextDto,
  InspectorVocabularyDto,
  MovedDto,
  RenamedDto,
  RenamePlanDto,
  RenumberedDto,
  StoryDateCheckDto,
  FolderChoiceDto,
  ManuscriptDto,
  ProjectChangeDto,
  ProjectSummaryDto,
  RecentProjectDto,
  SavedEntryDto
} from '../contract/dtos'

// One fixed channel per method; the renderer never gets a generic invoke.
function invoke<T>(channel: string, ...args: readonly unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

const plotDevice: PlotDeviceApi = {
  contractVersion: 7,
  workspace: {
    chooseFolder: () => invoke<FolderChoiceDto | null>(WORKSPACE_CHANNELS.chooseFolder),
    openProject: (root) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.openProject, root),
    initializeProject: (root, title) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.initializeProject, root, title),
    closeProject: () => invoke<undefined>(WORKSPACE_CHANNELS.closeProject),
    listRecentProjects: () =>
      invoke<readonly RecentProjectDto[]>(WORKSPACE_CHANNELS.listRecentProjects),
    removeRecentProject: (root) => invoke<undefined>(WORKSPACE_CHANNELS.removeRecentProject, root),
    refreshProject: () => invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.refreshProject),
    onProjectChanged: (listener) => {
      const handler = (_: unknown, changes: readonly ProjectChangeDto[]): void => {
        listener(changes)
      }
      ipcRenderer.on(EVENT_CHANNELS.projectChanged, handler)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.projectChanged, handler)
    }
  },
  manuscript: {
    getManuscript: () => invoke<ApiResult<ManuscriptDto>>(MANUSCRIPT_CHANNELS.getManuscript),
    openEntry: (path) => invoke<ApiResult<EntryTextDto>>(MANUSCRIPT_CHANNELS.openEntry, path),
    saveEntryText: (path, text, version, overwrite) =>
      invoke<ApiResult<SavedEntryDto>>(
        MANUSCRIPT_CHANNELS.saveEntryText,
        path,
        text,
        version,
        overwrite
      ),
    getEntryProperties: (path) =>
      invoke<ApiResult<EntryPropertiesViewDto>>(MANUSCRIPT_CHANNELS.getEntryProperties, path),
    updateEntryProperties: (path, version, changes) =>
      invoke<ApiResult<EntryPropertiesViewDto>>(
        MANUSCRIPT_CHANNELS.updateEntryProperties,
        path,
        version,
        changes
      ),
    createChapter: (partPath, title) =>
      invoke<ApiResult<CreatedEntryDto>>(MANUSCRIPT_CHANNELS.createChapter, partPath, title),
    createPart: (title) =>
      invoke<ApiResult<CreatedEntryDto>>(MANUSCRIPT_CHANNELS.createPart, title),
    renumberPart: (partPath) =>
      invoke<ApiResult<RenumberedDto>>(MANUSCRIPT_CHANNELS.renumberPart, partPath),
    addStatus: (status) =>
      invoke<ApiResult<readonly string[]>>(MANUSCRIPT_CHANNELS.addStatus, status),
    moveChapter: (path, destination) =>
      invoke<ApiResult<MovedDto>>(MANUSCRIPT_CHANNELS.moveChapter, path, destination),
    movePart: (path, index) =>
      invoke<ApiResult<MovedDto>>(MANUSCRIPT_CHANNELS.movePart, path, index),
    planRename: (path) =>
      invoke<ApiResult<RenamePlanDto | null>>(MANUSCRIPT_CHANNELS.planRename, path),
    renameEntry: (path) => invoke<ApiResult<RenamedDto>>(MANUSCRIPT_CHANNELS.renameEntry, path)
  },
  codex: {
    listCodex: () => invoke<ApiResult<CodexListingDto>>(CODEX_CHANNELS.listCodex),
    openEntry: (path) => invoke<ApiResult<EntryTextDto>>(CODEX_CHANNELS.openEntry, path),
    saveEntryText: (path, text, version, overwrite) =>
      invoke<ApiResult<SavedEntryDto>>(
        CODEX_CHANNELS.saveEntryText,
        path,
        text,
        version,
        overwrite
      ),
    getProperties: (path) =>
      invoke<ApiResult<CodexPropertiesViewDto>>(CODEX_CHANNELS.getProperties, path),
    updateProperties: (path, version, changes) =>
      invoke<ApiResult<CodexPropertiesViewDto>>(
        CODEX_CHANNELS.updateProperties,
        path,
        version,
        changes
      ),
    createEntry: (kind, title) =>
      invoke<ApiResult<CreatedEntryDto>>(CODEX_CHANNELS.createEntry, kind, title),
    setEntryType: (path, type) => invoke<ApiResult<null>>(CODEX_CHANNELS.setEntryType, path, type),
    planRename: (path) => invoke<ApiResult<RenamePlanDto | null>>(CODEX_CHANNELS.planRename, path),
    renameEntry: (path) => invoke<ApiResult<RenamedDto>>(CODEX_CHANNELS.renameEntry, path),
    getAppearsIn: (path) =>
      invoke<ApiResult<readonly AppearanceDto[]>>(CODEX_CHANNELS.getAppearsIn, path)
  },
  inspector: {
    getVocabulary: () =>
      invoke<ApiResult<InspectorVocabularyDto>>(INSPECTOR_CHANNELS.getVocabulary),
    checkStoryDate: (text) =>
      invoke<ApiResult<StoryDateCheckDto>>(INSPECTOR_CHANNELS.checkStoryDate, text)
  },
  app: {
    onBeforeClose: (listener) => {
      const handler = (): void => {
        listener()
      }
      ipcRenderer.on(APP_CHANNELS.beforeClose, handler)
      return () => ipcRenderer.removeListener(APP_CHANNELS.beforeClose, handler)
    },
    readyToClose: () => {
      ipcRenderer.send(APP_CHANNELS.readyToClose)
    },
    cancelClose: () => {
      ipcRenderer.send(APP_CHANNELS.cancelClose)
    }
  }
}

contextBridge.exposeInMainWorld('plotDevice', plotDevice)
