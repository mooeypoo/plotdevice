import { stat } from 'node:fs/promises'
import type { BrowserWindow } from 'electron'
import { EVENT_CHANNELS } from '../../contract/channels'
import type { FolderChoiceDto } from '../../contract/dtos'

/** Folders the app is asked to open from outside: the command line, or a file manager. */
export interface LaunchFolders {
  /** Keeps the folder the app started with, for the window to take once it's ready. */
  remember(path: string | undefined): void
  /** The remembered folder, inspected; `null` if there is none (or it isn't a folder). */
  take(): Promise<FolderChoiceDto | null>
  /** Sends a folder from a later launch to the running window. */
  send(window: BrowserWindow, path: string): Promise<void>
}

/**
 * Builds the launch folders. `inspect` is the same inspection "Open folder…" uses, so the folder
 * is allowed and then opened, or offered for a new project, exactly as if chosen in the dialog.
 */
export function createLaunchFolders(
  inspect: (path: string) => Promise<FolderChoiceDto | null>
): LaunchFolders {
  let pending: string | undefined
  const inspectFolder = async (path: string): Promise<FolderChoiceDto | null> => {
    const found = await stat(path).catch(() => undefined)
    return found?.isDirectory() === true ? inspect(path) : null
  }
  return {
    remember(path) {
      pending = path
    },
    async take() {
      const path = pending
      pending = undefined
      return path === undefined ? null : inspectFolder(path)
    },
    async send(window, path) {
      const choice = await inspectFolder(path)
      if (choice !== null && !window.isDestroyed()) {
        window.webContents.send(EVENT_CHANNELS.openFolder, choice)
      }
    }
  }
}
