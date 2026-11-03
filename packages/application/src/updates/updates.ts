import type { LatestRelease } from '@plotdevice/contracts'
import type { Result } from '@plotdevice/shared'
import type { AppDataFile } from '../ports/app-data-file'

/** Where the newest release is described: `latest.json` on GitHub, fetched by the host (Milestone 15). */
export interface UpdateSource {
  /**
   * The newest release, checked against `latestReleaseSchema`. Failing is normal: the computer may be
   * offline, or the file may be one this version can't read.
   */
  latest(): Promise<Result<LatestRelease, 'unreachable'>>
}

/** The automatic check asks at most this often. */
export const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000

const parse = (version: string): number[] | null => (/^\d+\.\d+\.\d+$/.test(version) ? version.split('.').map(Number) : null)

/** Whether `candidate` is a later plain `x.y.z` version than `current`. Anything else is never newer. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const [a, b] = [parse(candidate), parse(current)]
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return (a[i] ?? 0) > (b[i] ?? 0)
  return false
}

interface UpdateState {
  /** When the automatic check last got an answer. */
  checkedAt: number | null
  latest: LatestRelease | null
  /** The version the author said not to mention again. */
  dismissed: string | null
}

const EMPTY: UpdateState = { checkedAt: null, latest: null, dismissed: null }

/** A saved release, checked by shape; it was checked fully when it was fetched, and links are checked again when opened. */
function savedRelease(value: unknown): LatestRelease | null {
  if (typeof value !== 'object' || value === null) return null
  const release = value as Partial<Record<keyof LatestRelease, unknown>>
  const download = release.download as Record<string, unknown> | undefined
  const ok =
    release.format === 1 &&
    typeof release.version === 'string' &&
    /^\d+\.\d+\.\d+$/.test(release.version) &&
    typeof release.date === 'string' &&
    typeof release.notes === 'string' &&
    typeof download === 'object' &&
    download !== null &&
    Object.values(download).every((link) => typeof link === 'string') &&
    typeof download.en === 'string'
  return ok ? (value as LatestRelease) : null
}

/** Reads saved update state leniently: it's only a cache, so anything unexpected starts afresh. */
export function parseUpdateState(text: string | null): UpdateState {
  let data: unknown
  try {
    data = JSON.parse(text ?? 'null')
  } catch {
    return EMPTY
  }
  if (typeof data !== 'object' || data === null) return EMPTY
  const record = data as Record<string, unknown>
  return {
    checkedAt: typeof record.checkedAt === 'number' ? record.checkedAt : null,
    latest: savedRelease(record.latest),
    dismissed: typeof record.dismissed === 'string' ? record.dismissed : null,
  }
}

export type UpdateCheck = { kind: 'newer'; release: LatestRelease } | { kind: 'newest' } | { kind: 'failed' }

export interface UpdateSession {
  /** The newer version to mention: not dismissed, and only while checks are on. */
  notice(): LatestRelease | null
  /** The automatic check: only while checks are on, and at most once a day. Returns the notice after it. */
  checkIfDue(): Promise<LatestRelease | null>
  /** "Check for updates": asks now, whatever the setting, and reports a dismissed version too. */
  checkNow(): Promise<UpdateCheck>
  dismiss(version: string): Promise<void>
  /** Resolves once every save has finished. The app waits for this before quitting. */
  idle(): Promise<void>
}

export interface UpdateSessionOptions {
  source: UpdateSource
  /** `updates.json` in app data: the last answer, so a restart doesn't ask again the same day. */
  store: AppDataFile
  currentVersion: string
  /** The author's setting, read each time so turning it off takes effect at once. */
  enabled: () => boolean
  now: () => number
}

/**
 * Update notices (Milestone 15). Nothing is downloaded or installed: the app only learns that a newer
 * version exists and links to it. A failed check is quiet, and the next one tries again.
 */
export async function createUpdateSession({ source, store, currentVersion, enabled, now }: UpdateSessionOptions): Promise<UpdateSession> {
  let state = parseUpdateState(await store.read().catch(() => null))
  // Saves run one after another, so a slow one can't land after, and undo, a later one.
  let saving: Promise<unknown> = Promise.resolve()
  const save = (next: UpdateState): Promise<unknown> => {
    state = next
    const text = `${JSON.stringify(state, null, 2)}\n`
    saving = saving.then(() => store.write(text)).catch(() => undefined)
    return saving
  }
  const newer = (release: LatestRelease | null): LatestRelease | null =>
    release && isNewerVersion(release.version, currentVersion) ? release : null

  async function ask(): Promise<LatestRelease | null | 'failed'> {
    const answer = await source.latest()
    if (!answer.ok) return 'failed'
    await save({ ...state, checkedAt: now(), latest: answer.value })
    return answer.value
  }

  const session: UpdateSession = {
    notice: () => {
      const release = enabled() ? newer(state.latest) : null
      return release && release.version !== state.dismissed ? release : null
    },
    async checkIfDue() {
      if (!enabled()) return null
      const last = state.checkedAt
      // A clock set backwards counts as due, so a wrong date can't stop checks for good.
      if (last === null || now() - last >= UPDATE_INTERVAL_MS || last > now()) await ask()
      return session.notice()
    },
    async checkNow() {
      const release = await ask()
      if (release === 'failed') return { kind: 'failed' }
      const found = newer(release)
      return found ? { kind: 'newer', release: found } : { kind: 'newest' }
    },
    async dismiss(version) {
      await save({ ...state, dismissed: version })
    },
    idle: async () => {
      // Saves may be queued while waiting, so wait until the queue stops growing.
      let seen: Promise<unknown> | undefined
      while (seen !== saving) {
        seen = saving
        await saving
      }
    },
  }
  return session
}
