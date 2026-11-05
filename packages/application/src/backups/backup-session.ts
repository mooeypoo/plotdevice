import {
  backupFileName,
  backupsToRemove,
  bookFingerprint,
  isAutomaticBackupDue,
  projectFolderName,
  restoredCopyName,
  type CleanupRule,
  type LastBackup,
  type RecordedBackup,
} from '@plotdevice/domain'
import { err, ok, type ProjectPath, type Result } from '@plotdevice/shared'
import type { AppDataFile } from '../ports/app-data-file'
import type { BackupProblem, BookBackups } from '../ports/book-backups'
import type { ProjectFolders } from '../ports/project-folders'
import type { ProjectSnapshot } from '../ports/project-repository'

/**
 * Backups of each book (Milestone 20): a zip into a folder the author chose for that book, once a day
 * when the book changed, and whenever they ask. Never deleted unless the author turned on a clean-up
 * rule; then only the automatic backups this app recorded making, never the newest. The settings and
 * records live in app data, by the book's id, never in the book's folder.
 */
export interface BackupSession {
  status(): Promise<BackupStatus | null>
  /** `null` turns automatic backups off; the backups already saved stay where they are. */
  setFolder(folder: string | null): Promise<Result<BackupStatus, NoProject>>
  setCleanup(rule: CleanupRule | null): Promise<Result<BackupStatus, NoProject>>
  /** On closing a book: whether to offer backups now (once per book, and only once it has some content). */
  shouldOffer(): Promise<boolean>
  /** The author answered the offer ("Not now", or chose a folder); it isn't offered again for this book. */
  offered(): Promise<void>
  /** Saves an automatic backup if one is due, then applies the author's clean-up rule, if any. */
  runIfDue(): Promise<BackupRun>
  /** "Back up now": always, into the book's folder (or `folder`, which becomes the book's). Never cleaned up. */
  backUpNow(folder?: string): Promise<Result<string, BackupProblem | 'no-folder' | NoProject>>
  list(): Promise<Result<BookBackupEntry[], 'no-folder' | 'missing-folder' | NoProject>>
  preview(file: string): Promise<Result<RestorePreview, 'unreadable' | 'not-listed' | NoProject>>
  /** Unpacks the backup beside the book as a book of its own; returns its folder. The book isn't touched. */
  restoreAsCopy(file: string): Promise<Result<string, 'unreadable' | 'not-listed' | 'failed' | NoProject>>
  /** Saves the book as it is now, then puts the backup's files back; returns the "before restoring" backup. */
  restoreReplace(file: string): Promise<Result<{ before: string; snapshot: ProjectSnapshot }, ReplaceProblem>>
}

type NoProject = 'no-project'
export type ReplaceProblem = BackupProblem | 'unreadable' | 'not-listed' | 'restore-failed' | NoProject

export interface BackupStatus {
  folder: string | null
  cleanup: CleanupRule | null
  lastAt: number | null
  /** The folder chosen for the last book, offered first when choosing one for this book. */
  suggestedFolder: string | null
  /** What went wrong with the last automatic backup, until one succeeds. */
  problem: BackupProblem | null
}

export interface BackupRun {
  saved: string | null
  /** Paths of old automatic backups removed by the author's clean-up rule. */
  removed: string[]
  problem: BackupProblem | null
}

export interface BookBackupEntry {
  file: string
  name: string
  at: number
  /** Saved by the daily backup; the others were "Back up now", "before restoring", or found in the folder. */
  automatic: boolean
}

export interface RestorePreview {
  /** In both, and different. */
  changed: ProjectPath[]
  /** In the backup only: brought back by replacing. */
  returning: ProjectPath[]
  /** In the book only: kept, whichever way the author restores. */
  newer: ProjectPath[]
}

/** Something the book has the restore needs from the writing session: the open book, and a way to put files back. */
export interface BackupBook {
  project(): ProjectSnapshot | null
  restoreFiles(files: readonly { path: ProjectPath; text: string; hasBom: boolean }[]): Promise<Result<ProjectSnapshot, unknown>>
}

export interface BackupSessionOptions {
  backups: BookBackups
  records: AppDataFile
  folders: ProjectFolders
  book: BackupBook
  now: () => number
}

interface BookRecord {
  folder: string | null
  cleanup: CleanupRule | null
  offered: boolean
  last: LastBackup | null
  made: RecordedBackup[]
  problem: BackupProblem | null
}

interface Records {
  lastFolder: string | null
  books: Record<string, BookRecord>
}

const EMPTY_BOOK: BookRecord = { folder: null, cleanup: null, offered: false, last: null, made: [], problem: null }
const PROBLEMS: readonly BackupProblem[] = ['missing-folder', 'no-space', 'inside-book', 'failed']

/** The records as saved, keeping only what still makes sense; a damaged file starts over, set aside. */
function parseRecords(text: string | null): Records | null {
  if (text === null) return { lastFolder: null, books: {} }
  try {
    const data = JSON.parse(text) as Partial<Records>
    const books: Record<string, BookRecord> = {}
    for (const [key, value] of Object.entries(data.books ?? {})) {
      const book = value as Partial<BookRecord>
      books[key] = {
        folder: typeof book.folder === 'string' ? book.folder : null,
        cleanup: parseRule(book.cleanup),
        offered: book.offered === true,
        last: book.last && typeof book.last.at === 'number' && typeof book.last.fingerprint === 'string' ? book.last : null,
        made: Array.isArray(book.made) ? book.made.filter((m) => typeof m?.file === 'string' && typeof m?.at === 'number') : [],
        problem: PROBLEMS.find((p) => p === book.problem) ?? null,
      }
    }
    return { lastFolder: typeof data.lastFolder === 'string' ? data.lastFolder : null, books }
  } catch {
    return null
  }
}

function parseRule(value: unknown): CleanupRule | null {
  const rule = value as Partial<{ kind: string; months: unknown; count: unknown }> | null | undefined
  const positive = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0
  if (rule?.kind === 'older-than' && positive(rule.months)) return { kind: 'older-than', months: rule.months }
  if (rule?.kind === 'keep-newest' && positive(rule.count)) return { kind: 'keep-newest', count: rule.count }
  return null
}

/** A book is known by its id; a book without one, by its folder. */
const keyOf = (snapshot: ProjectSnapshot): string => snapshot.details.id ?? `root:${snapshot.root}`
const parentOf = (path: string): string => path.replace(/[\\/][^\\/]*$/, '')
const nameOf = (path: string): string => path.replace(/^.*[\\/]/, '')
/** "The Salt Orchard backup 2026-11-05 14.30.zip", or "… before restoring …": a backup of this book by its name. */
const isBackupOf = (title: string, name: string): boolean =>
  name.toLowerCase().endsWith('.zip') &&
  [`${projectFolderName(title)} backup `, `${projectFolderName(title)} before restoring `].some((prefix) => name.startsWith(prefix))

export function createBackupSession({ backups, records, folders, book, now }: BackupSessionOptions): BackupSession {
  let queue: Promise<unknown> = Promise.resolve()
  /** One change at a time, each from the records the previous one left. */
  const serially = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }

  async function load(): Promise<Records> {
    const parsed = parseRecords(await records.read())
    if (parsed) return parsed
    await records.setAside()
    return { lastFolder: null, books: {} }
  }

  async function update(snapshot: ProjectSnapshot, change: (book: BookRecord, all: Records) => void): Promise<BookRecord> {
    const all = await load()
    const key = keyOf(snapshot)
    const own = { ...EMPTY_BOOK, ...all.books[key] }
    change(own, all)
    all.books[key] = own
    await records.write(`${JSON.stringify(all, null, 2)}\n`)
    return own
  }

  const statusOf = (own: BookRecord, all: Records): BackupStatus => ({
    folder: own.folder,
    cleanup: own.cleanup,
    lastAt: own.last?.at ?? null,
    suggestedFolder: all.lastFolder,
    problem: own.problem,
  })

  async function fingerprintOf(snapshot: ProjectSnapshot): Promise<string> {
    const store = folders.open(snapshot.root)
    const files = await store.listMarkdownFiles()
    const revisions = await Promise.all(
      files.map(async (path) => {
        const read = await store.read(path)
        return { path, revision: read.ok ? read.value.revision : 'unreadable' }
      }),
    )
    return bookFingerprint(revisions)
  }

  async function takenIn(folder: string): Promise<Set<string>> {
    const listed = await backups.list(folder)
    return new Set(listed.ok ? listed.value.map((entry) => entry.name) : [])
  }

  async function save(snapshot: ProjectSnapshot, folder: string, kind: 'backup' | 'before-restoring' = 'backup') {
    const name = backupFileName(snapshot.details.title, new Date(now()), await takenIn(folder), kind)
    return backups.save(snapshot.root, folder, name)
  }

  async function listed(snapshot: ProjectSnapshot): Promise<Result<BookBackupEntry[], 'no-folder' | 'missing-folder'>> {
    const own = (await load()).books[keyOf(snapshot)]
    if (!own?.folder) return err('no-folder')
    const found = await backups.list(own.folder)
    if (!found.ok) return found
    const automatic = new Set(own.made.map((made) => made.file))
    const recordedAt = new Map(own.made.map((made) => [made.file, made.at]))
    return ok(
      found.value
        .filter((entry) => automatic.has(entry.file) || isBackupOf(snapshot.details.title, entry.name))
        .map((entry) => ({
          file: entry.file,
          name: entry.name,
          at: recordedAt.get(entry.file) ?? entry.modifiedAt,
          automatic: automatic.has(entry.file),
        }))
        .sort((a, b) => b.at - a.at),
    )
  }

  /** Only a backup the list offers can be restored: the page can't name any file on the computer. */
  async function listedFile(snapshot: ProjectSnapshot, file: string): Promise<BookBackupEntry | null> {
    const entries = await listed(snapshot)
    return entries.ok ? (entries.value.find((entry) => entry.file === file) ?? null) : null
  }

  return {
    async status() {
      const snapshot = book.project()
      if (!snapshot) return null
      const all = await load()
      return statusOf({ ...EMPTY_BOOK, ...all.books[keyOf(snapshot)] }, all)
    },

    setFolder: (folder) =>
      serially(async () => {
        const snapshot = book.project()
        if (!snapshot) return err('no-project')
        let all: Records | null = null
        const own = await update(snapshot, (record, records) => {
          record.folder = folder
          record.offered = true
          record.problem = null
          if (folder !== null) records.lastFolder = folder
          all = records
        })
        return ok(statusOf(own, all ?? (await load())))
      }),

    setCleanup: (rule) =>
      serially(async () => {
        const snapshot = book.project()
        if (!snapshot) return err('no-project')
        let all: Records | null = null
        const own = await update(snapshot, (record, records) => {
          record.cleanup = rule
          all = records
        })
        return ok(statusOf(own, all ?? (await load())))
      }),

    async shouldOffer() {
      const snapshot = book.project()
      if (!snapshot) return false
      const own = (await load()).books[keyOf(snapshot)]
      if (own?.offered || own?.folder) return false
      // Some content: a chapter with writing, and at least two pages about the story's world.
      const store = folders.open(snapshot.root)
      const files = await store.listMarkdownFiles()
      const pages = files.filter((file) => file.includes('/') && !/^(manuscript|outlines)\//.test(file))
      if (pages.length < 2) return false
      for (const file of files.filter((path) => path.startsWith('manuscript/'))) {
        const read = await store.read(file)
        if (read.ok && read.value.text.replace(/^---[\s\S]*?\n---\n?/, '').trim() !== '') return true
      }
      return false
    },

    offered: () =>
      serially(async () => {
        const snapshot = book.project()
        if (snapshot) await update(snapshot, (record) => (record.offered = true))
      }),

    runIfDue: () =>
      serially(async (): Promise<BackupRun> => {
        const nothing: BackupRun = { saved: null, removed: [], problem: null }
        const snapshot = book.project()
        if (!snapshot) return nothing
        const own = (await load()).books[keyOf(snapshot)]
        if (!own?.folder) return nothing
        const fingerprint = await fingerprintOf(snapshot)
        const at = now()
        if (!isAutomaticBackupDue(own.last, at, fingerprint)) return nothing
        const saved = await save(snapshot, own.folder)
        if (!saved.ok) {
          await update(snapshot, (record) => (record.problem = saved.error))
          return { ...nothing, problem: saved.error }
        }
        const removed: string[] = []
        await update(snapshot, (record) => {
          record.last = { at, fingerprint }
          record.problem = null
          record.made = [...record.made, { file: saved.value, at }]
        })
        if (own.cleanup) {
          const after = (await load()).books[keyOf(snapshot)]
          const candidates = backupsToRemove(after?.made ?? [], own.cleanup, at)
          // Only files still in the backup folder, as backups of this book: never anything else.
          const present = await backups.list(own.folder)
          const there = new Set(present.ok ? present.value.map((entry) => entry.file) : [])
          for (const file of candidates)
            if (there.has(file) && parentOf(file) === parentOf(saved.value) && (await backups.remove(file))) removed.push(file)
          await update(snapshot, (record) => {
            const gone = new Set(candidates.filter((file) => removed.includes(file) || !there.has(file)))
            record.made = record.made.filter((made) => !gone.has(made.file))
          })
        }
        return { saved: saved.value, removed, problem: null }
      }),

    backUpNow: (folder) =>
      serially(async () => {
        const snapshot = book.project()
        if (!snapshot) return err('no-project')
        const own = (await load()).books[keyOf(snapshot)]
        const target = folder ?? own?.folder ?? null
        if (target === null) return err('no-folder')
        const saved = await save(snapshot, target)
        if (!saved.ok) return saved
        const fingerprint = await fingerprintOf(snapshot)
        // Counts as today's backup, so an identical automatic one doesn't follow; it's never cleaned up.
        await update(snapshot, (record, all) => {
          if (folder !== undefined) {
            record.folder = folder
            all.lastFolder = folder
          }
          record.offered = true
          record.problem = null
          record.last = { at: now(), fingerprint }
        })
        return saved
      }),

    async list() {
      const snapshot = book.project()
      if (!snapshot) return err('no-project')
      return listed(snapshot)
    },

    async preview(file) {
      const snapshot = book.project()
      if (!snapshot) return err('no-project')
      if (!(await listedFile(snapshot, file))) return err('not-listed')
      const contents = await backups.read(file)
      if (!contents.ok) return contents
      const store = folders.open(snapshot.root)
      const inBook = new Set<string>(await store.listMarkdownFiles())
      const changed: ProjectPath[] = []
      const returning: ProjectPath[] = []
      for (const backed of contents.value.files) {
        if (!inBook.has(backed.path)) {
          returning.push(backed.path)
          continue
        }
        inBook.delete(backed.path)
        const current = await store.read(backed.path)
        if (!current.ok || current.value.text !== backed.text || current.value.hasBom !== backed.hasBom) changed.push(backed.path)
      }
      return ok({ changed: changed.sort(), returning: returning.sort(), newer: [...inBook].sort() as ProjectPath[] })
    },

    async restoreAsCopy(file) {
      const snapshot = book.project()
      if (!snapshot) return err('no-project')
      const entry = await listedFile(snapshot, file)
      if (!entry) return err('not-listed')
      // Beside the book; a name already taken there is refused by `unpack`, so the next number is tried.
      const taken = new Set([nameOf(snapshot.root)])
      for (let attempt = 0; attempt < 10; attempt++) {
        const name = restoredCopyName(snapshot.details.title, new Date(entry.at), taken)
        const unpacked = await backups.unpack(file, parentOf(snapshot.root), name)
        if (unpacked.ok) return unpacked
        if (unpacked.error !== 'exists') return err(unpacked.error)
        taken.add(name)
      }
      return err('failed')
    },

    restoreReplace: (file) =>
      serially(async () => {
        const snapshot = book.project()
        if (!snapshot) return err('no-project')
        if (!(await listedFile(snapshot, file))) return err('not-listed')
        const contents = await backups.read(file)
        if (!contents.ok) return contents
        // The book as it is now, first, beside the backup being restored: so this can be undone from the same list.
        const before = await save(snapshot, parentOf(file), 'before-restoring')
        if (!before.ok) return before
        const restored = await book.restoreFiles(contents.value.files)
        return restored.ok ? ok({ before: before.value, snapshot: restored.value }) : err('restore-failed')
      }),
  }
}
