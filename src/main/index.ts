import { app, BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import icon from '../../resources/icon.png?asset'
import { installAppMenu } from './app-menu'
import { composeApplication, composeUiLanguage, composeWindowStateStore } from './composition-root'
import { createTranslator } from '../i18n/translator'
import { UI_LANGUAGE_CHANNELS } from '../contract/channels'
import type { UiLanguageService } from './ui-language'
import { guardWindowClose } from './ipc/close-guard'
import { launchFolder, userArguments } from './launch-folder'
import { rememberWindow } from './remember-window'
import { isOnAnyDisplay, type WindowStateError, type WindowStateStore } from './window-state'

// Electron would name the settings folder after productName ("Plot Device", with a space).
// The folder name is part of the app identity (AGENTS.md) and must happen before `ready`.
app.setPath('userData', join(app.getPath('appData'), 'plotdevice'))

function isExternalWebLink(url: string): boolean {
  return URL.canParse(url) && new URL(url).protocol === 'https:'
}

function reportWindowStateError(error: WindowStateError): void {
  console.error(
    `Could not remember or restore the Plot Device window (${error.code}): ${error.message}`
  )
}

async function createMainWindow(
  store: WindowStateStore,
  language: UiLanguageService
): Promise<BrowserWindow> {
  const loaded = await store.load()
  if (!loaded.ok) reportWindowStateError(loaded.error)
  const saved = loaded.ok ? loaded.value : undefined
  const visible =
    saved !== undefined &&
    isOnAnyDisplay(
      saved.bounds,
      screen.getAllDisplays().map((display) => display.bounds)
    )
  if (saved !== undefined && !visible) {
    console.warn('Saved Plot Device window is off every current display; using 1200x800.')
  }
  const window = new BrowserWindow({
    ...(visible ? saved.bounds : { width: 1200, height: 800 }),
    show: false,
    title: 'Plot Device',
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  guardWindowClose(window)
  rememberWindow(window, store, reportWindowStateError)
  const translator = createTranslator(language.current().locale)
  installAppMenu(window, translator)
  const stopLanguage = language.onChanged((settings) => {
    translator.setLocale(settings.locale)
    installAppMenu(window, translator)
    window.webContents.send(UI_LANGUAGE_CHANNELS.onChanged, settings)
  })
  window.once('closed', stopLanguage)

  window.once('ready-to-show', () => {
    if (visible && saved.maximized) window.maximize()
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

  let launch: ReturnType<typeof composeApplication> | undefined

  // Started again (another `plotdevice <folder>`, or "Open With"): bring this window forward and
  // open the folder here.
  app.on('second-instance', (_event, argv, workingDirectory) => {
    if (mainWindow === undefined) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    const folder = launchFolder(userArguments(argv, app.isPackaged), workingDirectory)
    if (folder !== undefined) void launch?.send(mainWindow, folder)
  })

  void app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('tech.moriel.plotdevice')
    const language = await composeUiLanguage()
    launch = composeApplication(language)
    launch.remember(launchFolder(userArguments(process.argv, app.isPackaged), process.cwd()))
    mainWindow = await createMainWindow(composeWindowStateStore(), language)
  })
}

app.on('window-all-closed', () => {
  app.quit()
})
