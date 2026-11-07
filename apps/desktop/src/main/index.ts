import { projectTemplate, starter } from '@plotdevice/templates'
import {
  createBackupSession,
  createOutlineSession,
  createPreferencesSession,
  createRecentProjectsSession,
  createUpdateSession,
  createWritingSession,
  loadPreferences,
  type OutlineSession,
  type PreferencesStore,
  type ProjectRepository,
  type UpdateSession,
  type WritingSession,
} from '@plotdevice/application'
import { eventChannel, type AboutView, type AppInfo, type HostEvent } from '@plotdevice/contracts'
import { pageFolderOf } from '@plotdevice/domain'
import type { ProjectPath } from '@plotdevice/shared'
import {
  createAppDataFile,
  createBackupStore,
  createJournalStore,
  createPreferencesFileStore,
  createProjectFolders,
  randomIdGenerator,
  watchProject,
  type ProjectWatcher,
  writeAtomically,
  createBookBackups,
  findSyncFolders,
  prepareSampleBook,
} from '@plotdevice/fs-node'
import { catalogs, createTranslator } from '@plotdevice/i18n'
import {
  createOutlineRepository,
  createProjectRepository,
  createReferenceRepository,
  createVersionRepository,
  withBackups,
} from '@plotdevice/storage'
import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from 'electron'
import { access, readFile, rename, stat } from 'node:fs/promises'
import { basename, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import icon from '../../../../assets/brand/icons/512x512.png?asset'
import { applicationMenu } from './app-menu'
import { dataHome, integrateAppImage } from './appimage-desktop'
import { PRINT_FAMILIES, PRINT_FONTS, printToPdf } from './print-to-pdf'
import { createIpcHandlers } from './ipc'
import { folderFromArgs } from './launch-folder'
import { openedProject, openProblem } from './project-ipc'
import { denyAllPermissions, hardenWebContents } from './security'
import { enableSpellingMenu, spellcheckLanguages } from './spellcheck'
import { updateView } from './update-ipc'
import { createUpdateSource, GITHUB_HOSTS, LATEST_RELEASE_URL } from './update-source'
import { hostEvent, outlineEvent } from './views'

// Tests may point unpackaged builds at a temporary folder.
const testUserData = app.isPackaged ? undefined : process.env.PLOTDEVICE_USER_DATA
// Release builds keep settings in `plotdevice` (ADR 0001, Milestone 7); development builds in
// `plotdevice-dev`, so testing never touches them. Electron's own `--user-data-dir` switch wins, which
// lets tests run an installed build against a temporary folder.
if (!app.commandLine.hasSwitch('user-data-dir')) {
  app.setPath('userData', testUserData ?? join(app.getPath('appData'), app.isPackaged ? 'plotdevice' : 'plotdevice-dev'))
}

// One Plot Device at a time per settings folder: a second launch hands its folder to the running app.
if (!app.requestSingleInstanceLock()) app.quit()

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
  // Before the window opens, so the taskbar finds the entry (and its icon) for it from the first start.
  if (process.platform === 'linux' && process.env.APPIMAGE)
    await integrateAppImage({ appImage: process.env.APPIMAGE, icon, home: dataHome() }).catch((error: unknown) =>
      console.warn('Could not add Plot Device to the applications menu.', error),
    )
  const userData = app.getPath('userData')
  const store = withSlowPreferences(createPreferencesFileStore(userData))
  const loaded = await loadPreferences(store, app.getLocale())
  if (loaded.notice) console.warn('The settings file could not be read. Defaults are in use; the old file was kept.')
  const preferences = createPreferencesSession(store, loaded.preferences)
  const t = createTranslator(catalogs)
  const translate = (key: string): string => t(preferences.current().locale, key)

  // Every write goes through these folders, so every file is backed up before the app changes it (Milestone 6).
  const backups = createBackupStore(userData)
  // Deleted files go to the computer's Trash, where the author can get them back.
  const folders = withBackups(createProjectFolders({ trash: testTrash ?? ((path) => shell.trashItem(path)) }), { backups, now: Date.now })
  const versions = createVersionRepository({ folders: createProjectFolders(), backups, now: Date.now })
  const repository = withSlowChapterSaves(
    createProjectRepository({ folders, journals: createJournalStore(userData), ids: randomIdGenerator }),
  )
  const writing = createWritingSession({ repository, copyLabel: () => translate('conflict-copy-label') })
  const outlines = createOutlineSession({ repository: createOutlineRepository({ folders }), root: () => writing.project()?.root ?? null })
  const recent = await createRecentProjectsSession(createAppDataFile(userData, 'recent'))
  const isSampleBook = (root: string): boolean => resolve(root).startsWith(join(userData, 'sample') + sep)
  // Each book's own backups, as zips in a folder the author chose for it (Milestone 20).
  const bookBackups = createBackupSession({
    backups: createBookBackups(),
    records: createAppDataFile(userData, 'backups'),
    folders: createProjectFolders(),
    book: writing,
    now: Date.now,
    neverOffer: (root) => isSampleBook(root),
  })
  const updates = await createUpdateSession({
    source: createUpdateSource(
      testUpdateUrl
        ? { url: testUpdateUrl, hosts: [new URL(testUpdateUrl).hostname], allowHttp: true }
        : { url: LATEST_RELEASE_URL, hosts: GITHUB_HOSTS },
    ),
    store: createAppDataFile(userData, 'updates'),
    currentVersion: app.getVersion(),
    // Development builds don't check on their own (tests point them at a local server instead).
    enabled: () => preferences.current().checkForUpdates && (app.isPackaged || testUpdateUrl !== undefined),
    now: Date.now,
  })
  pendingWork.push(
    () => preferences.idle(),
    () => writing.idle(),
    () => recent.idle(),
    () => outlines.idle(),
    () => updates.idle(),
    // Quitting is leaving the book: today's backup, if one is due.
    () => runBackups(),
  )
  // The watcher can start before the window exists (reopening the last project); events wait for it.
  let tellPage: (event: HostEvent) => void = () => undefined
  const stopWatching = watchOpenProject(writing, outlines, () => tellPage({ kind: 'references-changed' }))
  pendingWork.push(stopWatching)
  /** An automatic backup if one is due, telling the page only when something needs saying. */
  async function runBackups(): Promise<void> {
    const title = writing.project()?.details.title ?? ''
    const run = await bookBackups.runIfDue()
    if (run.problem !== null || run.removed.length > 0)
      tellPage({ kind: 'backup-ran', title, removed: run.removed.length, problem: run.problem })
  }
  setInterval(() => void runBackups(), BACKUP_CHECK_MS).unref()
  /** Opens a folder given at launch ("Open with", or the command line), and remembers it. */
  const openFolder = async (folder: string): Promise<HostEvent> => {
    const isFolder = await stat(folder).then(
      (info) => info.isDirectory(),
      () => false,
    )
    if (!isFolder) return { kind: 'open-failed', error: 'not-a-project' }
    await runBackups()
    const opened = await writing.openProject(folder)
    if (!opened.ok) return { kind: 'open-failed', error: openProblem(opened.error) }
    await recent.opened({ root: opened.value.root, title: opened.value.details.title })
    return { kind: 'project-opened', opened: openedProject(opened.value, recent) }
  }
  const launchFolder = folderFromArgs(process.argv, app.getAppPath())
  // A folder that fails to open is reported once the page is there to show it.
  const launchProblem = launchFolder ? await openFolder(launchFolder) : null
  if (!launchFolder) await reopenLastProject(writing, recent.current().projects[0]?.root)

  Menu.setApplicationMenu(
    Menu.buildFromTemplate(applicationMenu(process.platform, { developer: !app.isPackaged, viewLabel: translate('menu-view') })),
  )
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    title: 'Plot Device',
    // Linux shows this in the dock and window list; installed builds also have it from the desktop file.
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
    },
  })
  // The menu works through its shortcuts only; the app's own menus are on screen instead.
  if (process.platform !== 'darwin') window.setMenuBarVisibility(false)
  tellPage = (event) => window.webContents.send(eventChannel, event)
  writing.onEvent((event) => window.webContents.send(eventChannel, hostEvent(event)))
  outlines.onEvent((event) => window.webContents.send(eventChannel, outlineEvent(event)))
  enableSpellingMenu(window, translate)
  // Linux and Windows check spelling with the dictionaries chosen here; macOS detects the language itself.
  const checkSpelling = (): void => {
    const project = writing.project()
    const available = session.defaultSession.availableSpellCheckerLanguages
    session.defaultSession.setSpellCheckerLanguages(
      spellcheckLanguages(project?.details.language ?? 'en', preferences.current().locale, available),
    )
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
  // Closing the window is leaving the book: its text is saved, today's backup made if due, and, once per
  // book with some content, backups are offered; the window closes when the author answers. Closing
  // again while the offer shows closes at once.
  let answerOffer: () => void = () => undefined
  window.on('close', (event) => {
    if (pageFlushed) return
    event.preventDefault()
    void flushPage()
      .then(() => runBackups())
      .then(async () => {
        if (!(await bookBackups.shouldOffer())) return
        await new Promise<void>((resolve) => {
          answerOffer = resolve
          tellPage({ kind: 'offer-backups' })
        })
      })
      .finally(() => window.close())
  })

  const chooseFolder = async (titleKey: string, start?: string): Promise<string | null> => {
    if (testFolderChoice !== undefined) return testFolderChoice || null
    const chosen = await dialog.showOpenDialog(window, {
      title: translate(titleKey),
      ...(start ? { defaultPath: start } : {}),
      buttonLabel: translate('dialog-choose'),
      properties: ['openDirectory', 'createDirectory'],
    })
    return chosen.canceled ? null : (chosen.filePaths[0] ?? null)
  }

  const appInfo: AppInfo = { name: 'Plot Device', version: app.getVersion(), platform: platformOf(process.platform) }
  const checkForUpdates = (): Promise<void> => announceUpdate(updates, (event) => !window.isDestroyed() && tellPage(event))
  const handlers = createIpcHandlers({
    appUrl,
    appInfo,
    about: () => readAbout(appInfo),
    currentPreferences: () => preferences.current(),
    updatePreferences: async (patch) => {
      const saved = await preferences.update(patch)
      // Turning update checks on checks straight away, if a day has passed since the last answer.
      if (saved.ok && patch.checkForUpdates) void checkForUpdates()
      return saved
    },
    projects: {
      session: writing,
      recent,
      chooseProjectFolder: () => chooseFolder('dialog-open-project'),
      chooseNewProjectLocation: () => chooseFolder('dialog-new-project-location'),
      // Tests never make projects in the real Documents folder.
      defaultProjectLocation: testFolderChoice || app.getPath('documents'),
      template: projectTemplate,
      folderExists: (path) =>
        access(path).then(
          () => true,
          () => false,
        ),
      onFlushed: () => flushWaiters.splice(0).forEach((resolve) => resolve()),
      leavingBook: () => runBackups(),
      sampleBook: (language, fresh) => {
        const name = SAMPLE_BOOKS[language]
        return prepareSampleBook(join(samplesFolder(), name), join(userData, 'sample', name), fresh)
      },
      isSample: (root) => isSampleBook(root),
    },
    outlines: { outlines, writing, recent, starter: (id, language) => starter(id, language).body },
    references: { references: createReferenceRepository({ folders }), writing, recent },
    versions: {
      versions,
      writing,
      outlines,
      repository,
      copyLabel: (at) =>
        translate('version-copy-label').replace(
          '$1',
          new Intl.DateTimeFormat(preferences.current().locale, { dateStyle: 'medium', timeStyle: 'short' })
            .format(at)
            .replace(/[:/]/g, '.'),
        ),
    },
    updates: { updates },
    backups: {
      backups: bookBackups,
      writing,
      recent,
      chooseFolder: async (start) =>
        testBackupTo !== undefined ? testBackupTo || null : chooseFolder('dialog-backup-location', start ?? undefined),
      syncFolders: () =>
        testBackupTo !== undefined ? Promise.resolve([]) : findSyncFolders(app.getPath('home'), process.platform, process.env),
      showFolder: async (path) => void (await shell.openPath(path)),
      offerAnswered: () => answerOffer(),
      runBackups,
    },
    exports: {
      writing,
      folders: createProjectFolders(),
      remembered: createAppDataFile(userData, 'export'),
      region: app.getLocaleCountryCode() || null,
      // Paragraphs without a mark follow the book's language, as the editor shows them (ADR 0004).
      directionMode: () => 'project',
      words: (language) => {
        const locale = language.startsWith('he') ? 'he' : 'en'
        return {
          chapter: (number) => t(locale, 'export-file-chapter', number),
          about: (count) => t(locale, 'export-file-word-count', count),
          by: t(locale, 'export-file-by'),
          contents: t(locale, 'export-file-contents'),
        }
      },
      chooseSaveLocation: async (suggested, format) => {
        if (testSaveAs !== undefined) return testSaveAs || null
        const filter = EXPORT_FILTERS[format]
        const chosen = await dialog.showSaveDialog(window, {
          defaultPath: suggested,
          filters: [{ name: translate(filter.name), extensions: [filter.extension] }],
        })
        return chosen.canceled || !chosen.filePath ? null : chosen.filePath
      },
      chooseCover: async () => {
        if (testCover !== undefined) return testCover || null
        const chosen = await dialog.showOpenDialog(window, {
          title: translate('dialog-export-cover'),
          filters: [{ name: translate('dialog-export-cover-pictures'), extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
          properties: ['openFile'],
        })
        return chosen.canceled ? null : (chosen.filePaths[0] ?? null)
      },
      readFile: (path) =>
        readFile(path).then(
          (bytes) => new Uint8Array(bytes),
          () => null,
        ),
      writeOutside: (path, bytes) =>
        writeAtomically(path, bytes).then(
          () => true,
          () => false,
        ),
      printToPdf,
      printFonts: PRINT_FONTS,
      printFamilies: PRINT_FAMILIES,
      hebrewFont: async () => {
        const folder = fontsFolder()
        const [regular, bold] = await Promise.all(
          ['DavidLibre-Regular.ttf', 'DavidLibre-Bold.ttf'].map((name) =>
            readFile(join(folder, name)).then(
              (bytes) => new Uint8Array(bytes),
              () => null,
            ),
          ),
        )
        return regular ? { name: 'David Libre', regular, ...(bold ? { bold } : {}), fallback: 'David' } : null
      },
      showFile: async (path) => shell.showItemInFolder(path),
      now: () => new Date(),
    },
  })
  for (const [channel, handle] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event, payload: unknown) =>
      handle({ url: event.senderFrame?.url, fromAppWindow: event.sender === window.webContents }, payload),
    )
  }

  window.webContents.once('did-finish-load', () => {
    if (launchProblem?.kind === 'open-failed') tellPage(launchProblem)
    // Shortly after opening, so it never competes with the book; then now and then while the app is open.
    setTimeout(() => void checkForUpdates(), testUpdateUrl ? 0 : UPDATE_FIRST_CHECK_MS)
    setInterval(() => void checkForUpdates(), UPDATE_RECHECK_MS).unref()
  })
  app.on('second-instance', (_event, argv) => {
    if (window.isMinimized()) window.restore()
    window.focus()
    const folder = folderFromArgs(argv, app.getAppPath())
    if (folder) void openFolder(folder).then(tellPage)
  })

  window.once('ready-to-show', () => window.show())
  await (devServerUrl ? window.loadURL(devServerUrl) : window.loadFile(indexFile))
})

const FLUSH_TIMEOUT_MS = 2000
/** How often an open book is checked for its daily backup (Milestone 20). */
const BACKUP_CHECK_MS = 60 * 60 * 1000
const UPDATE_FIRST_CHECK_MS = 5000
/** How often a long-open app looks again; the check itself still asks GitHub at most once a day. */
const UPDATE_RECHECK_MS = 6 * 60 * 60 * 1000

/** Test-only (unpackaged builds): the folder every folder dialog "chooses"; empty means cancelled. */
const testFolderChoice = app.isPackaged ? undefined : process.env.PLOTDEVICE_TEST_CHOOSE_FOLDER
/** Test-only (unpackaged builds): the folder a backup goes to; empty means cancelled. */
const testBackupTo = app.isPackaged ? undefined : process.env.PLOTDEVICE_TEST_BACKUP_TO
/**
 * Test-only (unpackaged builds): a folder that stands in for the Trash, so tests never fill the real
 * one; `none` means this computer has no Trash.
 */
const testTrashFolder = app.isPackaged ? undefined : process.env.PLOTDEVICE_TEST_TRASH
const testTrash =
  testTrashFolder === undefined
    ? undefined
    : async (path: string): Promise<void> => {
        if (testTrashFolder === 'none') throw new Error('no Trash')
        await rename(path, join(testTrashFolder, basename(path)))
      }
/** Test-only (unpackaged builds): the file every save dialog "chooses"; empty means cancelled. */
const testSaveAs = app.isPackaged ? undefined : process.env.PLOTDEVICE_TEST_SAVE_AS
/** Test-only (unpackaged builds): the picture the cover picker "chooses"; empty means cancelled. */
const testCover = app.isPackaged ? undefined : process.env.PLOTDEVICE_TEST_COVER
/** Test-only (unpackaged builds): a local server standing in for GitHub's latest.json. */
const testUpdateUrl = app.isPackaged ? undefined : process.env.PLOTDEVICE_TEST_UPDATE_URL

/** Runs the automatic update check, and tells the page about a newer version (Milestone 15). */
async function announceUpdate(updates: UpdateSession, tell: (event: HostEvent) => void): Promise<void> {
  const release = await updates.checkIfDue()
  if (release) tell({ kind: 'update-available', update: updateView(release) })
}

/**
 * The licence and the credits list: shipped as resources in an installed app, and found in the
 * repository (where `pnpm build` generates the list) during development.
 */
/** The sample books to try (Milestone 20), one per interface language, bundled with the app. */
const SAMPLE_BOOKS = { en: 'the-salt-orchard', he: 'מטע-המלח' } as const
const samplesFolder = (): string => (app.isPackaged ? join(process.resourcesPath, 'samples') : join(app.getAppPath(), '../../samples'))
/** Fonts packed into exported Word files (Milestone 22). */
const fontsFolder = (): string => (app.isPackaged ? join(process.resourcesPath, 'fonts') : join(app.getAppPath(), 'resources/fonts'))
/** What each export format's save dialog offers. */
const EXPORT_FILTERS = {
  word: { name: 'dialog-export-word', extension: 'docx' },
  pdf: { name: 'dialog-export-pdf', extension: 'pdf' },
  epub: { name: 'dialog-export-epub', extension: 'epub' },
  markdown: { name: 'dialog-export-markdown', extension: 'md' },
} as const

async function readAbout(appInfo: AppInfo): Promise<AboutView> {
  const [licensePath, creditsPath] = app.isPackaged
    ? [join(process.resourcesPath, 'LICENSE'), join(process.resourcesPath, 'third-party-licenses.json')]
    : [join(app.getAppPath(), '../../LICENSE'), join(app.getAppPath(), 'build/third-party-licenses.json')]
  const licenseText = await readFile(licensePath, 'utf8').catch(() => '')
  const thirdParty = await readFile(creditsPath, 'utf8').then(
    (text) => JSON.parse(text) as AboutView['thirdParty'],
    () => [],
  )
  return { name: appInfo.name, version: appInfo.version, licenseText, thirdParty }
}

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
        // A page in any kind's folder, or one the book doesn't list yet (ADR 0011).
        if (pageFolderOf(change.path as ProjectPath) !== null) referencesChanged()
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
  return testSaveDelayMs
    ? { ...repository, saveChapter: async (...args) => (await testDelay(), repository.saveChapter(...args)) }
    : repository
}

function platformOf(platform: NodeJS.Platform): AppInfo['platform'] {
  return platform === 'linux' || platform === 'win32' || platform === 'darwin' ? platform : 'other'
}
