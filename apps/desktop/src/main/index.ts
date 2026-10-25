import {
  createOutlineSession,
  createPreferencesSession,
  createRecentProjectsSession,
  createWritingSession,
  loadPreferences,
  type OutlineSession,
  type PreferencesStore,
  type ProjectRepository,
  type WritingSession,
} from '@plotdevice/application'
import { eventChannel, type AppInfo, type HostEvent } from '@plotdevice/contracts'
import { createAppDataFile, createJournalStore, createPreferencesFileStore, createProjectFolders, randomIdGenerator, watchProject, type ProjectWatcher } from '@plotdevice/fs-node'
import { catalogs, createTranslator } from '@plotdevice/i18n'
import { createOutlineRepository, createProjectRepository, createReferenceRepository } from '@plotdevice/storage'
import { app, BrowserWindow, dialog, ipcMain, session } from 'electron'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createIpcHandlers } from './ipc'
import { denyAllPermissions, hardenWebContents } from './security'
import { enableSpellingMenu, spellcheckLanguages } from './spellcheck'
import { hostEvent, outlineEvent } from './views'

// Development builds keep their own settings, apart from any installed release (ADR 0001). Tests may
// point unpackaged builds at a temporary folder.
const testUserData = app.isPackaged ? undefined : process.env.PLOTDEVICE_USER_DATA
app.setPath('userData', testUserData ?? join(app.getPath('appData'), 'plotdevice-dev'))

const devServerUrl = process.env.ELECTRON_RENDERER_URL
const indexFile = join(import.meta.dirname, '../renderer/index.html')
const appUrl = devServerUrl ?? pathToFileURL(indexFile).href

app.on('web-contents-created', (_event, contents) => hardenWebContents(contents))
app.on('window-all-closed', () => app.quit())

/** Work that must finish before the app quits, such as a settings save still in progress. */
const pendingWork: (() => Promise<void>)[] = []
/** Asks the page to send text still waiting for its autosave delay; set once the window exists. */
let flushPage: () => Promise<void> = async () => undefined
let finishedPendingWork = false
app.on('before-quit', (event) => {
  if (finishedPendingWork) return
  // Closing right after a change must not lose it (seen on Windows, where saves are slower). The page
  // sends its pending text first, so the saves waited for below include it.
  event.preventDefault()
  void flushPage()
    .then(() => Promise.all(pendingWork.map((wait) => wait())))
    .finally(() => {
      finishedPendingWork = true
      app.quit()
    })
})

void app.whenReady().then(async () => {
  denyAllPermissions(session.defaultSession)
  const userData = app.getPath('userData')
  const store = withSlowPreferences(createPreferencesFileStore(userData))
  const loaded = await loadPreferences(store, app.getLocale())
  if (loaded.notice) console.warn('The settings file could not be read. Defaults are in use; the old file was kept.')
  const preferences = createPreferencesSession(store, loaded.preferences)
  const t = createTranslator(catalogs)
  const translate = (key: string): string => t(preferences.current().locale, key)

  const repository = withSlowChapterSaves(createProjectRepository({ folders: createProjectFolders(), journals: createJournalStore(userData), ids: randomIdGenerator }))
  const writing = createWritingSession({ repository, copyLabel: () => translate('conflict-copy-label') })
  const outlines = createOutlineSession({ repository: createOutlineRepository({ folders: createProjectFolders() }), root: () => writing.project()?.root ?? null })
  const recent = await createRecentProjectsSession(createAppDataFile(userData, 'recent'))
  pendingWork.push(() => preferences.idle(), () => writing.idle(), () => recent.idle(), () => outlines.idle())
  // The watcher can start before the window exists (reopening the last project); events wait for it.
  let tellPage: (event: HostEvent) => void = () => undefined
  const stopWatching = watchOpenProject(writing, outlines, () => tellPage({ kind: 'references-changed' }))
  pendingWork.push(stopWatching)
  await reopenLastProject(writing, recent.current().projects[0]?.root)

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
  tellPage = (event) => window.webContents.send(eventChannel, event)
  writing.onEvent((event) => window.webContents.send(eventChannel, hostEvent(event)))
  outlines.onEvent((event) => window.webContents.send(eventChannel, outlineEvent(event)))
  enableSpellingMenu(window, translate)
  // Linux and Windows check spelling with the dictionaries chosen here; macOS detects the language itself.
  const checkSpelling = (): void => {
    const project = writing.project()
    const available = session.defaultSession.availableSpellCheckerLanguages
    session.defaultSession.setSpellCheckerLanguages(spellcheckLanguages(project?.details.language ?? 'en', preferences.current().locale, available))
  }
  if (process.platform !== 'darwin') {
    checkSpelling()
    writing.onEvent((event) => event.kind === 'project-changed' && checkSpelling())
  }

  // Before the window closes, the page sends any text still waiting for its autosave delay.
  const flushWaiters: (() => void)[] = []
  let pageFlushed = false
  flushPage = async () => {
    if (pageFlushed || window.isDestroyed()) return
    await new Promise<void>((resolve) => {
      flushWaiters.push(resolve)
      window.webContents.send(eventChannel, { kind: 'flush' })
      setTimeout(resolve, FLUSH_TIMEOUT_MS)
    })
    pageFlushed = true
  }
  window.on('close', (event) => {
    if (pageFlushed) return
    event.preventDefault()
    void flushPage().then(() => window.close())
  })

  const chooseFolder = async (titleKey: string): Promise<string | null> => {
    if (testFolderChoice !== undefined) return testFolderChoice || null
    const chosen = await dialog.showOpenDialog(window, { title: translate(titleKey), buttonLabel: translate('dialog-choose'), properties: ['openDirectory', 'createDirectory'] })
    return chosen.canceled ? null : (chosen.filePaths[0] ?? null)
  }

  const appInfo: AppInfo = { name: 'Plot Device', version: app.getVersion(), platform: platformOf(process.platform) }
  const handlers = createIpcHandlers({
    appUrl,
    appInfo,
    currentPreferences: () => preferences.current(),
    updatePreferences: (patch) => preferences.update(patch),
    projects: {
      session: writing,
      recent,
      chooseProjectFolder: () => chooseFolder('dialog-open-project'),
      chooseNewProjectLocation: () => chooseFolder('dialog-new-project-location'),
      folderExists: (path) => access(path).then(() => true, () => false),
      onFlushed: () => flushWaiters.splice(0).forEach((resolve) => resolve()),
    },
    outlines: { outlines, writing, recent },
    references: { references: createReferenceRepository({ folders: createProjectFolders() }), writing, recent },
  })
  for (const [channel, handle] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event, payload: unknown) => handle({ url: event.senderFrame?.url, fromAppWindow: event.sender === window.webContents }, payload))
  }

  window.once('ready-to-show', () => window.show())
  await (devServerUrl ? window.loadURL(devServerUrl) : window.loadFile(indexFile))
})

const FLUSH_TIMEOUT_MS = 2000

/** Test-only (unpackaged builds): the folder every folder dialog "chooses"; empty means cancelled. */
const testFolderChoice = app.isPackaged ? undefined : process.env.PLOTDEVICE_TEST_CHOOSE_FOLDER

const REFRESH_DELAY_MS = 300

/**
 * Watches the open project's folder for changes made by other programs. A changed chapter is checked
 * (and reloaded quietly if it has no unsaved edits); anything else refreshes the project shortly after.
 */
function watchOpenProject(writing: WritingSession, outlines: OutlineSession, referencesChanged: () => void): () => Promise<void> {
  let watched: { root: string; watcher: ProjectWatcher } | null = null
  let refresh: ReturnType<typeof setTimeout> | undefined
  writing.onEvent((event) => {
    if (event.kind !== 'project-changed' || watched?.root === event.project.root) return
    void watched?.watcher.close()
    outlines.reset() // another project: its outlines and their undo history are gone
    watched = {
      root: event.project.root,
      watcher: watchProject(event.project.root, (change) => {
        if (change.kind === 'changed' && change.path.startsWith('outlines/')) void outlines.fileChanged(change.path)
        else if (change.kind === 'changed') void writing.fileChanged(change.path)
        if (/^(characters|places|notes)\//.test(change.path)) referencesChanged()
        clearTimeout(refresh)
        refresh = setTimeout(() => void writing.refreshProject(), REFRESH_DELAY_MS)
      }),
    }
  })
  return async () => {
    clearTimeout(refresh)
    await watched?.watcher.close()
  }
}

/** Returns the author to the project they had open (PRD G2). If it can't be opened, the welcome screen shows instead. */
async function reopenLastProject(writing: WritingSession, root: string | undefined): Promise<void> {
  if (root === undefined) return
  const opened = await writing.openProject(root)
  if (!opened.ok) console.warn(`The last project could not be reopened (${opened.error}).`)
}

/**
 * Test-only (unpackaged builds): slows every settings and chapter save, so end-to-end tests can
 * reproduce a save still running when the app is closed, as happens on Windows.
 */
const testSaveDelayMs = app.isPackaged ? 0 : Number(process.env.PLOTDEVICE_TEST_SAVE_DELAY_MS ?? 0)
const testDelay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, testSaveDelayMs))

function withSlowPreferences(store: PreferencesStore): PreferencesStore {
  return testSaveDelayMs ? { ...store, write: async (text) => (await testDelay(), store.write(text)) } : store
}

function withSlowChapterSaves(repository: ProjectRepository): ProjectRepository {
  return testSaveDelayMs ? { ...repository, saveChapter: async (...args) => (await testDelay(), repository.saveChapter(...args)) } : repository
}

function platformOf(platform: NodeJS.Platform): AppInfo['platform'] {
  return platform === 'linux' || platform === 'win32' || platform === 'darwin' ? platform : 'other'
}
