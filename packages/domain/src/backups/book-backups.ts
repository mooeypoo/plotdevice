import { projectFolderName } from '../manuscript/chapter-files'

// Automatic backups of a book (Milestone 20): a zip of the whole book, once a day when something
// changed, into a folder the author chose for that book. Nothing is ever removed unless the author
// turned on a clean-up rule, and then only backups the app made itself, never the newest.

const DAY = 24 * 3_600_000

/** What the app remembers about the last automatic backup of a book. */
export interface LastBackup {
  at: number
  fingerprint: string
}

/** Due when there has never been one, or a day has passed and the book changed since. */
export function isAutomaticBackupDue(last: LastBackup | null, now: number, fingerprint: string): boolean {
  if (last === null) return true
  return now - last.at >= DAY && fingerprint !== last.fingerprint
}

/**
 * The book's state in one short string: every file's path and revision, in a fixed order. Two equal
 * fingerprints mean nothing changed. FNV-1a, because the domain has no crypto and it needs no secrecy.
 */
export function bookFingerprint(files: readonly { path: string; revision: string }[]): string {
  const text = [...files]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((file) => `${file.path}\u0000${file.revision}`)
    .join('\u0001')
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `${hash.toString(16).padStart(8, '0')}-${files.length}`
}

export type BackupKind = 'backup' | 'before-restoring'

const two = (n: number): string => String(n).padStart(2, '0')
/** "2026-11-05 14.30", in local time. */
const stampOf = (at: Date): string =>
  `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}.${two(at.getMinutes())}`

/**
 * "The Salt Orchard backup 2026-11-05 14.30.zip", in the computer's local time; "14.30" because
 * Windows can't use ":". A name already in `taken` gets " 2", " 3"…
 */
export function backupFileName(title: string, at: Date, taken: ReadonlySet<string>, kind: BackupKind = 'backup'): string {
  const base = `${projectFolderName(title)} ${kind === 'backup' ? 'backup' : 'before restoring'} ${stampOf(at)}`
  const lower = new Set([...taken].map((name) => name.toLowerCase()))
  for (let n = 1; ; n++) {
    const name = `${base}${n === 1 ? '' : ` ${n}`}.zip`
    if (!lower.has(name.toLowerCase())) return name
  }
}

/** "The Salt Orchard (2026-11-05 14.30)": a backup opened as a book of its own, beside the book. */
export function restoredCopyName(title: string, at: Date, taken: ReadonlySet<string>): string {
  const base = `${projectFolderName(title)} (${stampOf(at)})`
  const lower = new Set([...taken].map((name) => name.toLowerCase()))
  for (let n = 1; ; n++) {
    const name = `${base}${n === 1 ? '' : ` ${n}`}`
    if (!lower.has(name.toLowerCase())) return name
  }
}

/** A clean-up rule the author turned on; there is none until they do. */
export type CleanupRule = { kind: 'older-than'; months: number } | { kind: 'keep-newest'; count: number }

/** A backup the app made automatically, as recorded. "Back up now" backups are never recorded here. */
export interface RecordedBackup {
  file: string
  at: number
}

/** Which recorded automatic backups the rule removes: never the newest, never any without a rule. */
export function backupsToRemove(backups: readonly RecordedBackup[], rule: CleanupRule | null, now: number): string[] {
  if (rule === null || backups.length === 0) return []
  const newestFirst = [...backups].sort((a, b) => b.at - a.at)
  const [, ...older] = newestFirst
  if (rule.kind === 'keep-newest') return newestFirst.slice(Math.max(1, rule.count)).map((backup) => backup.file)
  const limit = new Date(now)
  limit.setMonth(limit.getMonth() - rule.months)
  return older.filter((backup) => backup.at < limit.getTime()).map((backup) => backup.file)
}
