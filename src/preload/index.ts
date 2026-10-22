import { contextBridge, ipcRenderer } from 'electron'
import type { AppMenuCommand, PlotDeviceApi } from '../contract/api'
import {
  APP_CHANNELS,
  UI_LANGUAGE_CHANNELS,
  RECOVERY_CHANNELS,
  CODEX_CHANNELS,
  EVENT_CHANNELS,
  INSPECTOR_CHANNELS,
  MANUSCRIPT_CHANNELS,
  TIMELINE_CHANNELS,
  INTERACTIONS_CHANNELS,
  WORKSPACE_CHANNELS
} from '../contract/channels'
import type {
  UiLanguageDto,
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
  TimelineDto,
  InteractionsDto,
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
  contractVersion: 25,
  uiLanguage: {
    get: () => invoke<UiLanguageDto>(UI_LANGUAGE_CHANNELS.get),
    set: (locale) => invoke<ApiResult<UiLanguageDto>>(UI_LANGUAGE_CHANNELS.set, locale),
    onChanged: (listener) => {
      const handler = (_: unknown, settings: UiLanguageDto): void => {
        listener(settings)
      }
      ipcRenderer.on(UI_LANGUAGE_CHANNELS.onChanged, handler)
      return () => ipcRenderer.removeListener(UI_LANGUAGE_CHANNELS.onChanged, handler)
    }
  },
  recovery: {
    capture: (path, version) => invoke<ApiResult<string>>(RECOVERY_CHANNELS.capture, path, version),
    saveCopy: (token, text) =>
      invoke<ApiResult<CreatedEntryDto>>(RECOVERY_CHANNELS.saveCopy, token, text)
  },
  workspace: {
    chooseFolder: () => invoke<ApiResult<FolderChoiceDto | null>>(WORKSPACE_CHANNELS.chooseFolder),
    openProject: (root) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.openProject, root),
    initializeProject: (root, title) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.initializeProject, root, title),
    closeProject: () => invoke<undefined>(WORKSPACE_CHANNELS.closeProject),
    listRecentProjects: () =>
      invoke<ApiResult<readonly RecentProjectDto[]>>(WORKSPACE_CHANNELS.listRecentProjects),
    removeRecentProject: (root) =>
      invoke<ApiResult<null>>(WORKSPACE_CHANNELS.removeRecentProject, root),
    refreshProject: () => invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.refreshProject),
    takeLaunchFolder: () =>
      invoke<ApiResult<FolderChoiceDto | null>>(WORKSPACE_CHANNELS.takeLaunchFolder),
    onOpenFolder: (listener) => {
      const handler = (_: unknown, result: ApiResult<FolderChoiceDto | null>): void => {
        listener(result)
      }
      ipcRenderer.on(EVENT_CHANNELS.openFolder, handler)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.openFolder, handler)
    },
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
    fixWarning: (path, fix) => invoke<ApiResult<null>>(MANUSCRIPT_CHANNELS.fixWarning, path, fix),
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
    updateRelationships: (path, version, relationships) =>
      invoke<ApiResult<CodexPropertiesViewDto>>(
        CODEX_CHANNELS.updateRelationships,
        path,
        version,
        relationships
      ),
    createEntry: (kind, title) =>
      invoke<ApiResult<CreatedEntryDto>>(CODEX_CHANNELS.createEntry, kind, title),
    createOutline: (title) =>
      invoke<ApiResult<CreatedEntryDto>>(CODEX_CHANNELS.createOutline, title),
    editTemplate: (kind) => invoke<ApiResult<CreatedEntryDto>>(CODEX_CHANNELS.editTemplate, kind),
    setEntryType: (path, type) => invoke<ApiResult<null>>(CODEX_CHANNELS.setEntryType, path, type),
    planRename: (path) => invoke<ApiResult<RenamePlanDto | null>>(CODEX_CHANNELS.planRename, path),
    renameEntry: (path) => invoke<ApiResult<RenamedDto>>(CODEX_CHANNELS.renameEntry, path),
    getAppearsIn: (path) =>
      invoke<ApiResult<readonly AppearanceDto[]>>(CODEX_CHANNELS.getAppearsIn, path)
  },
  timeline: {
    getTimeline: () => invoke<ApiResult<TimelineDto>>(TIMELINE_CHANNELS.getTimeline)
  },
  interactions: {
    getInteractions: () => invoke<ApiResult<InteractionsDto>>(INTERACTIONS_CHANNELS.getInteractions)
  },
  inspector: {
    getVocabulary: () =>
      invoke<ApiResult<InspectorVocabularyDto>>(INSPECTOR_CHANNELS.getVocabulary),
    checkStoryDate: (text) =>
      invoke<ApiResult<StoryDateCheckDto>>(INSPECTOR_CHANNELS.checkStoryDate, text)
  },
  app: {
    onMenuCommand: (listener) => {
      const handler = (_: unknown, command: AppMenuCommand): void => {
        listener(command)
      }
      ipcRenderer.on(APP_CHANNELS.menuCommand, handler)
      return () => ipcRenderer.removeListener(APP_CHANNELS.menuCommand, handler)
    },
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
