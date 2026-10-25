import { createPreferencesSession, loadPreferences } from '@plotdevice/application'
import type { AppInfo } from '@plotdevice/contracts'
import { createPreferencesFileStore } from '@plotdevice/fs-node'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createIpcHandlers } from './ipc'
import { denyAllPermissions, hardenWebContents } from './security'

// Development builds keep their own settings, apart from any installed release (ADR 0001). Tests may
// point unpackaged builds at a temporary folder.
const testUserData = app.isPackaged ? undefined : process.env.PLOTDEVICE_USER_DATA
app.setPath('userData', testUserData ?? join(app.getPath('appData'), 'plotdevice-dev'))

const devServerUrl = process.env.ELECTRON_RENDERER_URL
const indexFile = join(import.meta.dirname, '../renderer/index.html')
const appUrl = devServerUrl ?? pathToFileURL(indexFile).href

app.on('web-contents-created', (_event, contents) => hardenWebContents(contents))
app.on('window-all-closed', () => app.quit())

void app.whenReady().then(async () => {
  denyAllPermissions(session.defaultSession)
  const store = createPreferencesFileStore(app.getPath('userData'))
  const loaded = await loadPreferences(store, app.getLocale())
  if (loaded.notice) console.warn('The settings file could not be read. Defaults are in use; the old file was kept.')
  const preferences = createPreferencesSession(store, loaded.preferences)

  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    title: 'Plot Device',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
    },
  })

  const appInfo: AppInfo = { name: 'Plot Device', version: app.getVersion(), platform: platformOf(process.platform) }
  const handlers = createIpcHandlers({
    appUrl,
    appInfo,
    currentPreferences: () => preferences.current(),
    updatePreferences: (patch) => preferences.update(patch),
  })
  for (const [channel, handle] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event, payload: unknown) => handle({ url: event.senderFrame?.url, fromAppWindow: event.sender === window.webContents }, payload))
  }

  window.once('ready-to-show', () => window.show())
  await (devServerUrl ? window.loadURL(devServerUrl) : window.loadFile(indexFile))
})

function platformOf(platform: NodeJS.Platform): AppInfo['platform'] {
  return platform === 'linux' || platform === 'win32' || platform === 'darwin' ? platform : 'other'
}
