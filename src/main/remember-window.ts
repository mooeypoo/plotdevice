import type { BrowserWindow } from 'electron'
import type { WindowStateError, WindowStateStore } from './window-state'

type CloseEvent = { readonly defaultPrevented: boolean; preventDefault(): void }

/** The small window surface needed to remember geometry without coupling tests to Electron. */
export interface RememberedWindow extends Pick<
  BrowserWindow,
  'getNormalBounds' | 'isMaximized' | 'isMinimized' | 'isDestroyed' | 'close'
> {
  on(event: 'close', listener: (event: CloseEvent) => void): void
  on(event: 'maximize' | 'unmaximize', listener: () => void): void
}

/** Saves normal geometry after the renderer's close guard permits closing, before app exit. */
export function rememberWindow(
  window: RememberedWindow,
  store: WindowStateStore,
  reportError: (error: WindowStateError) => void
): void {
  let maximized = window.isMaximized()
  let saving = false
  let saved = false
  window.on('maximize', () => {
    maximized = true
  })
  window.on('unmaximize', () => {
    if (!window.isMinimized()) maximized = false
  })
  window.on('close', (event) => {
    if (event.defaultPrevented || saved) return
    event.preventDefault()
    if (saving) return
    saving = true
    void store
      .save({
        version: 1,
        bounds: window.getNormalBounds(),
        maximized: window.isMinimized() ? maximized : window.isMaximized()
      })
      .then((result) => {
        if (!result.ok) reportError(result.error)
        saved = true
        if (!window.isDestroyed()) window.close()
      })
  })
}
