import { BrowserWindow, dialog } from 'electron'
import { WORKSPACE_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { WorkspaceHandlers } from './workspace-handlers'

/** Registers the workspace handlers on their fixed channels. */
export function registerWorkspaceIpc(handlers: WorkspaceHandlers): void {
  handleTrusted(WORKSPACE_CHANNELS.chooseFolder, (event) =>
    handlers.chooseFolder(() => showFolderDialog(BrowserWindow.fromWebContents(event.sender)))
  )
  handleTrusted(WORKSPACE_CHANNELS.openProject, (_, args) => handlers.openProject(args))
  handleTrusted(WORKSPACE_CHANNELS.initializeProject, (_, args) => handlers.initializeProject(args))
  handleTrusted(WORKSPACE_CHANNELS.closeProject, () => handlers.closeProject())
  handleTrusted(WORKSPACE_CHANNELS.listRecentProjects, () => handlers.listRecentProjects())
  handleTrusted(WORKSPACE_CHANNELS.removeRecentProject, (_, args) =>
    handlers.removeRecentProject(args)
  )
}

async function showFolderDialog(window: BrowserWindow | null): Promise<string | undefined> {
  const options: Electron.OpenDialogOptions = {
    title: 'Open or create a project folder',
    properties: ['openDirectory', 'createDirectory']
  }
  const result =
    window === null
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(window, options)
  return result.canceled ? undefined : result.filePaths[0]
}
