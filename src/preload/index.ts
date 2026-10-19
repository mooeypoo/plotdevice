import { contextBridge, ipcRenderer } from 'electron'
import type { PlotDeviceApi } from '../contract/api'
import { WORKSPACE_CHANNELS } from '../contract/channels'
import type {
  ApiResult,
  FolderChoiceDto,
  ProjectSummaryDto,
  RecentProjectDto
} from '../contract/dtos'

// One fixed channel per method; the renderer never gets a generic invoke.
function invoke<T>(channel: string, ...args: readonly unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

const plotDevice: PlotDeviceApi = {
  contractVersion: 2,
  workspace: {
    chooseFolder: () => invoke<FolderChoiceDto | null>(WORKSPACE_CHANNELS.chooseFolder),
    openProject: (root) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.openProject, root),
    initializeProject: (root, title) =>
      invoke<ApiResult<ProjectSummaryDto>>(WORKSPACE_CHANNELS.initializeProject, root, title),
    listRecentProjects: () =>
      invoke<readonly RecentProjectDto[]>(WORKSPACE_CHANNELS.listRecentProjects),
    removeRecentProject: (root) => invoke<undefined>(WORKSPACE_CHANNELS.removeRecentProject, root)
  }
}

contextBridge.exposeInMainWorld('plotDevice', plotDevice)
