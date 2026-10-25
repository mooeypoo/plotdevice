import { describe, expect, it } from 'vitest'
import { BACKUP_INTERVAL_MS, backupsToKeep, isBackupDue } from './retention'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const now = Date.UTC(2026, 9, 25, 18, 0, 0) // Sunday 25 October 2026, 18:00 UTC

describe('when to back up', () => {
  it('before the first change in a session, then at most every ten minutes', () => {
    expect(isBackupDue(null, now)).toBe(true)
    expect(isBackupDue(now - BACKUP_INTERVAL_MS + 1, now)).toBe(false)
    expect(isBackupDue(now - BACKUP_INTERVAL_MS, now)).toBe(true)
    expect(BACKUP_INTERVAL_MS).toBe(10 * 60_000)
  })
})

describe('which backups to keep', () => {
  it('keeps everything from the last 24 hours', () => {
    const recent = [now - 1000, now - HOUR, now - 23 * HOUR, now - DAY + 1]
    expect(backupsToKeep(recent, now)).toEqual(new Set(recent))
  })

  it('then the newest of each day for 30 days', () => {
    const twoDaysAgoMorning = Date.UTC(2026, 9, 23, 8)
    const twoDaysAgoEvening = Date.UTC(2026, 9, 23, 20)
    const tenDaysAgo = Date.UTC(2026, 9, 15, 12)
    expect(backupsToKeep([twoDaysAgoMorning, twoDaysAgoEvening, tenDaysAgo], now)).toEqual(new Set([twoDaysAgoEvening, tenDaysAgo]))
  })

  it('then the newest of each week for a year, and nothing older', () => {
    const fortyDaysAgo = now - 40 * DAY
    const sameWeekEarlier = fortyDaysAgo - DAY
    const twoHundredDaysAgo = now - 200 * DAY
    const overAYear = now - 366 * DAY
    const kept = backupsToKeep([fortyDaysAgo, sameWeekEarlier, twoHundredDaysAgo, overAYear], now)
    expect(kept.has(twoHundredDaysAgo)).toBe(true)
    expect(kept.has(overAYear)).toBe(false)
    expect([kept.has(fortyDaysAgo), kept.has(sameWeekEarlier)].filter(Boolean)).toHaveLength(1)
  })

  it('always keeps the newest backup, however old', () => {
    const old = now - 500 * DAY
    expect(backupsToKeep([old], now)).toEqual(new Set([old]))
  })

  it('counts days and weeks in UTC, so the result never depends on the machine’s time zone', () => {
    const justBeforeMidnight = Date.UTC(2026, 9, 20, 23, 59)
    const justAfterMidnight = Date.UTC(2026, 9, 21, 0, 1)
    expect(backupsToKeep([justBeforeMidnight, justAfterMidnight], now)).toEqual(new Set([justBeforeMidnight, justAfterMidnight]))
  })
})
