import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import icon from '../../resources/icon.png?asset'
import { composeApplication } from './composition-root'
import { guardWindowClose } from './ipc/close-guard'

// Electron would name the settings folder after productName ("Plot Device", with a space).
// The folder name is part of the app identity (AGENTS.md) and must happen before `ready`.
app.setPath('userData', join(app.getPath('appData'), 'plotdevice'))

function isExternalWebLink(url: string): boolean {
  return URL.canParse(url) && new URL(url).protocol === 'https:'
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: 'Plot Device',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  guardWindowClose(window)

  window.once('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalWebLink(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event) => {
    if (event.url !== window.webContents.getURL()) event.preventDefault()
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl !== undefined) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

// Two instances could autosave the same chapter and overwrite each other's writing.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | undefined

  app.on('second-instance', () => {
    if (mainWindow === undefined) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('tech.moriel.plotdevice')
    composeApplication()
    mainWindow = createMainWindow()
  })
}

app.on('window-all-closed', () => {
  app.quit()
})
