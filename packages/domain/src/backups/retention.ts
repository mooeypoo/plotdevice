/** A file is backed up before the app first changes it in a session, then at most this often (Milestone 6, decision 1). */
export const BACKUP_INTERVAL_MS = 10 * 60_000

const DAY = 24 * 3_600_000

export function isBackupDue(lastBackupAt: number | null, now: number): boolean {
  return lastBackupAt === null || now - lastBackupAt >= BACKUP_INTERVAL_MS
}

/**
 * Which backups to keep, by when they were taken (Milestone 6, decision 2): everything from the last
 * 24 hours, then the newest of each day for 30 days, then the newest of each week for a year. The
 * newest backup is always kept. Days and weeks are counted in UTC, so the answer doesn't depend on
 * the machine's time zone.
 */
export function backupsToKeep(times: readonly number[], now: number): Set<number> {
  const keep = new Set<number>()
  const newestIn = new Map<string, number>()
  for (const time of times) {
    const age = now - time
    if (age < DAY) {
      keep.add(time)
      continue
    }
    const bucket = age < 30 * DAY ? `day-${Math.floor(time / DAY)}` : age < 365 * DAY ? `week-${Math.floor((time / DAY + 3) / 7)}` : null
    if (bucket && time > (newestIn.get(bucket) ?? Number.NEGATIVE_INFINITY)) newestIn.set(bucket, time)
  }
  for (const time of newestIn.values()) keep.add(time)
  const newest = Math.max(...times)
  if (Number.isFinite(newest)) keep.add(newest)
  return keep
}
