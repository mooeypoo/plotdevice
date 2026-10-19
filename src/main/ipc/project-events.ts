import { BrowserWindow } from 'electron'
import { EVENT_CHANNELS } from '../../contract/channels'
import type { ProjectChangeDto } from '../../contract/dtos'

/** Tells the window which files other programs changed in the open project. */
export function sendProjectChanges(changes: readonly ProjectChangeDto[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(EVENT_CHANNELS.projectChanged, changes)
  }
}
