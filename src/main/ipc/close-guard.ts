import { ipcMain, type BrowserWindow } from 'electron'
import { APP_CHANNELS } from '../../contract/channels'

/** How long to wait for the renderer to finish saving before closing anyway. */
const SAVE_TIMEOUT_MS = 5000

/**
 * Holds a window open until its renderer has saved pending edits, so the last few seconds of
 * typing are never lost when the window closes.
 */
export function guardWindowClose(window: BrowserWindow): void {
  let readyToClose = false
  let timeout: NodeJS.Timeout | undefined

  const closeNow = (): void => {
    if (timeout !== undefined) clearTimeout(timeout)
    readyToClose = true
    if (!window.isDestroyed()) window.close()
  }

  ipcMain.on(APP_CHANNELS.readyToClose, (event) => {
    if (event.sender === window.webContents) closeNow()
  })

  ipcMain.on(APP_CHANNELS.cancelClose, (event) => {
    if (event.sender !== window.webContents || timeout === undefined) return
    clearTimeout(timeout)
    timeout = undefined
  })

  window.on('close', (event) => {
    if (readyToClose) return
    event.preventDefault()
    if (timeout !== undefined) return
    window.webContents.send(APP_CHANNELS.beforeClose)
    timeout = setTimeout(closeNow, SAVE_TIMEOUT_MS)
  })
}
