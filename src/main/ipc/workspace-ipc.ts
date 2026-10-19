import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { WORKSPACE_CHANNELS } from '../../contract/channels'
import type { WorkspaceHandlers } from './workspace-handlers'

/** Registers the workspace handlers on their fixed channels. */
export function registerWorkspaceIpc(handlers: WorkspaceHandlers): void {
  handle(WORKSPACE_CHANNELS.chooseFolder, (event) =>
    handlers.chooseFolder(() => showFolderDialog(BrowserWindow.fromWebContents(event.sender)))
  )
  handle(WORKSPACE_CHANNELS.openProject, (_, args) => handlers.openProject(args))
  handle(WORKSPACE_CHANNELS.initializeProject, (_, args) => handlers.initializeProject(args))
  handle(WORKSPACE_CHANNELS.listRecentProjects, () => handlers.listRecentProjects())
  handle(WORKSPACE_CHANNELS.removeRecentProject, (_, args) => handlers.removeRecentProject(args))
}

function handle(
  channel: string,
  respond: (event: IpcMainInvokeEvent, args: readonly unknown[]) => Promise<unknown>
): void {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    // Only the app's own window, and only its top frame, may call the API.
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window === null || event.senderFrame !== event.sender.mainFrame) {
      throw new Error(`Rejected ${channel} from an unexpected sender.`)
    }
    return respond(event, args)
  })
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
