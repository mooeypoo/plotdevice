import type { WorkspaceApi } from './api'

/** IPC channel names, shared by the preload (which invokes) and main (which handles). */
export const WORKSPACE_CHANNELS = {
  chooseFolder: 'workspace:choose-folder',
  openProject: 'workspace:open-project',
  initializeProject: 'workspace:initialize-project',
  listRecentProjects: 'workspace:list-recent-projects',
  removeRecentProject: 'workspace:remove-recent-project'
} as const satisfies Record<keyof WorkspaceApi, string>
