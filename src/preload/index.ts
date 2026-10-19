import { contextBridge, ipcRenderer } from 'electron'
import type { PlotDeviceApi } from '../contract/api'
import { APP_CHANNELS, MANUSCRIPT_CHANNELS, WORKSPACE_CHANNELS } from '../contract/channels'
import type {
  ApiResult,
  EntryTextDto,
  FolderChoiceDto,
  ManuscriptDto,
  ProjectSummaryDto,
  RecentProjectDto,
  SavedEntryDto
} from '../contract/dtos'

// One fixed channel per method; the renderer never gets a generic invoke.
function invoke<T>(channel: string, ...args: readonly unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

const plotDevice: PlotDeviceApi = {
  contractVersion: 3,
  workspace: {
    chooseFolder: () => invoke<FolderChoiceDto | null>(WORKSPACE_CHANNELS.chooseFolder),
    openProject: (root) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.openProject, root),
    initializeProject: (root, title) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.initializeProject, root, title),
    closeProject: () => invoke<undefined>(WORKSPACE_CHANNELS.closeProject),
    listRecentProjects: () =>
      invoke<readonly RecentProjectDto[]>(WORKSPACE_CHANNELS.listRecentProjects),
    removeRecentProject: (root) => invoke<undefined>(WORKSPACE_CHANNELS.removeRecentProject, root)
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
      )
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
