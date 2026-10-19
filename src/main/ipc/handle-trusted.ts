import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'

/** Registers an IPC handler that only the app's own window, and only its top frame, may call. */
export function handleTrusted(
  channel: string,
  respond: (event: IpcMainInvokeEvent, args: readonly unknown[]) => Promise<unknown>
): void {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window === null || event.senderFrame !== event.sender.mainFrame) {
      throw new Error(`Rejected ${channel} from an unexpected sender.`)
    }
    return respond(event, args)
  })
}
