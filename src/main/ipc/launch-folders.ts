import type { BrowserWindow } from 'electron'
import { EVENT_CHANNELS } from '../../contract/channels'
import type { ApiResult, FolderChoiceDto } from '../../contract/dtos'

/** Folders the app is asked to open from outside: the command line, or a file manager. */
export interface LaunchFolders {
  /** Keeps the folder the app started with, for the window to take once it's ready. */
  remember(path: string | undefined): void
  /** The remembered folder, inspected; successful `null` only when there is none. */
  take(): Promise<ApiResult<FolderChoiceDto | null>>
  /** Sends a folder from a later launch to the running window. */
  send(window: BrowserWindow, path: string): Promise<void>
}

/**
 * Builds the launch folders. `inspect` is the same inspection "Open folder…" uses, so the folder
 * is allowed and then opened, or offered for a new project, exactly as if chosen in the dialog.
 */
export function createLaunchFolders(
  inspect: (path: string) => Promise<ApiResult<FolderChoiceDto | null>>
): LaunchFolders {
  let pending: string | undefined
  let sendRequest = 0
  return {
    remember(path) {
      pending = path
    },
    async take() {
      const path = pending
      pending = undefined
      return path === undefined ? { ok: true, value: null } : inspect(path)
    },
    async send(window, path) {
      const request = ++sendRequest
      const result = await inspect(path)
      if (request === sendRequest && !window.isDestroyed()) {
        window.webContents.send(EVENT_CHANNELS.openFolder, result)
      }
    }
  }
}
