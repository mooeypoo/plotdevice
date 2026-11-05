import { describe, expect, it } from 'vitest'
import { backupFileName, backupsToRemove, bookFingerprint, isAutomaticBackupDue, restoredCopyName } from './book-backups'

const HOUR = 3_600_000
const DAY = 24 * HOUR

describe('when an automatic backup is due', () => {
  const at = Date.UTC(2026, 10, 5, 12)
  it('the first time, at once', () => {
    expect(isAutomaticBackupDue(null, at, 'a')).toBe(true)
  })
  it('a day later, only if the book changed', () => {
    expect(isAutomaticBackupDue({ at, fingerprint: 'a' }, at + DAY, 'b')).toBe(true)
    expect(isAutomaticBackupDue({ at, fingerprint: 'a' }, at + 30 * DAY, 'a')).toBe(false)
  })
  it('never twice in a day', () => {
    expect(isAutomaticBackupDue({ at, fingerprint: 'a' }, at + 23 * HOUR, 'b')).toBe(false)
  })
})

describe('the book’s fingerprint', () => {
  const frost = { path: 'manuscript/frost.md', revision: 'r1' }
  const contents = { path: 'CONTENTS.md', revision: 'r2' }
  const files = [frost, contents]
  it('is the same for the same files in any order, and changes with any file', () => {
    expect(bookFingerprint([...files].reverse())).toBe(bookFingerprint(files))
    expect(bookFingerprint([{ ...frost, revision: 'r3' }, contents])).not.toBe(bookFingerprint(files))
    expect(bookFingerprint([...files, { path: 'notes/new.md', revision: 'r1' }])).not.toBe(bookFingerprint(files))
  })
})

describe('backup names', () => {
  const at = new Date(2026, 10, 5, 14, 30)
  it('carry the title, the date and the local time, with no character Windows refuses', () => {
    expect(backupFileName('The Salt Orchard', at, new Set())).toBe('The Salt Orchard backup 2026-11-05 14.30.zip')
    expect(backupFileName('מטע המלח', at, new Set())).toBe('מטע המלח backup 2026-11-05 14.30.zip')
    expect(backupFileName('Who: me?', at, new Set())).toBe('Who me backup 2026-11-05 14.30.zip')
    expect(backupFileName('The Salt Orchard', at, new Set(), 'before-restoring')).toBe(
      'The Salt Orchard before restoring 2026-11-05 14.30.zip',
    )
  })
  it('add a number when the minute is taken, in any letter case', () => {
    expect(backupFileName('Salt', at, new Set(['salt backup 2026-11-05 14.30.zip']))).toBe('Salt backup 2026-11-05 14.30 2.zip')
  })
})

describe('a backup opened as a copy', () => {
  it('is named after the book and the backup’s time, with a number if taken', () => {
    const at = new Date(2026, 10, 5, 14, 30)
    expect(restoredCopyName('The Salt Orchard', at, new Set())).toBe('The Salt Orchard (2026-11-05 14.30)')
    expect(restoredCopyName('Salt', at, new Set(['Salt (2026-11-05 14.30)']))).toBe('Salt (2026-11-05 14.30) 2')
  })
})

describe('clean-up, only when the author turned it on', () => {
  const now = Date.UTC(2026, 10, 5)
  const backups = [0, 10, 40, 100, 200, 400].map((days) => ({ file: `${days}.zip`, at: now - days * DAY }))
  it('removes nothing without a rule', () => {
    expect(backupsToRemove(backups, null, now)).toEqual([])
  })
  it('older than some months', () => {
    expect(backupsToRemove(backups, { kind: 'older-than', months: 6 }, now)).toEqual(['200.zip', '400.zip'])
  })
  it('keeps the newest N', () => {
    expect(backupsToRemove(backups, { kind: 'keep-newest', count: 4 }, now)).toEqual(['200.zip', '400.zip'])
  })
  it('never the newest, however old', () => {
    const old = [{ file: 'only.zip', at: now - 900 * DAY }]
    expect(backupsToRemove(old, { kind: 'older-than', months: 1 }, now)).toEqual([])
    expect(backupsToRemove(backups, { kind: 'keep-newest', count: 0 }, now)).toHaveLength(5)
  })
})
