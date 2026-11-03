import type { LatestRelease } from '@plotdevice/contracts'
import { err, ok, type Result } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { AppDataFile } from '../ports/app-data-file'
import { createUpdateSession, isNewerVersion, parseUpdateState, UPDATE_INTERVAL_MS, type UpdateSource } from './updates'

const release = (version: string): LatestRelease => ({
  format: 1,
  version,
  date: '2026-11-20',
  notes: `https://github.com/mooeypoo/plotdevice/releases/tag/v${version}`,
  download: { en: 'https://mooeypoo.github.io/plotdevice/start/install/' },
})

function memoryStore(initial: string | null = null) {
  const state = { text: initial }
  const store: AppDataFile = {
    read: async () => state.text,
    write: async (text) => ((state.text = text), ok(undefined)),
    setAside: async () => undefined,
  }
  return { store, state }
}

/** A source that answers with each of `answers` in turn, counting the requests. */
function source(...answers: (LatestRelease | 'offline')[]) {
  const asked = { count: 0 }
  const latest: UpdateSource = {
    latest: async (): Promise<Result<LatestRelease, 'unreachable'>> => {
      const answer = answers[Math.min(asked.count++, answers.length - 1)]
      return answer === 'offline' || answer === undefined ? err('unreachable') : ok(answer)
    },
  }
  return { latest, asked }
}

const DAY = UPDATE_INTERVAL_MS

async function session(options: {
  answers: (LatestRelease | 'offline')[]
  saved?: string | null
  enabled?: boolean
  at?: { time: number }
  current?: string
}) {
  const at = options.at ?? { time: 10 * DAY }
  const { latest, asked } = source(...options.answers)
  const { store, state } = memoryStore(options.saved ?? null)
  const settings = { enabled: options.enabled ?? true }
  const updates = await createUpdateSession({
    source: latest,
    store,
    currentVersion: options.current ?? '0.3.0',
    enabled: () => settings.enabled,
    now: () => at.time,
  })
  return { updates, asked, state, settings, at }
}

describe('comparing versions', () => {
  it('compares each number, not the text', () => {
    expect(isNewerVersion('0.10.0', '0.9.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.99.99')).toBe(true)
    expect(isNewerVersion('0.3.1', '0.3.0')).toBe(true)
  })

  it('never calls the same, an older, or an unreadable version newer', () => {
    expect(isNewerVersion('0.3.0', '0.3.0')).toBe(false)
    expect(isNewerVersion('0.2.9', '0.3.0')).toBe(false)
    expect(isNewerVersion('0.4.0-beta.1', '0.3.0')).toBe(false)
    expect(isNewerVersion('v0.4.0', '0.3.0')).toBe(false)
  })
})

describe('the automatic check', () => {
  it('mentions a newer version', async () => {
    const { updates } = await session({ answers: [release('0.4.0')] })
    expect((await updates.checkIfDue())?.version).toBe('0.4.0')
    expect(updates.notice()?.version).toBe('0.4.0')
  })

  it('stays quiet about the version already running, or an older one', async () => {
    expect(await (await session({ answers: [release('0.3.0')] })).updates.checkIfDue()).toBeNull()
    expect(await (await session({ answers: [release('0.2.0')] })).updates.checkIfDue()).toBeNull()
  })

  it('asks at most once a day, and remembers the answer across restarts', async () => {
    const first = await session({ answers: [release('0.4.0')] })
    await first.updates.checkIfDue()
    await first.updates.checkIfDue()
    expect(first.asked.count).toBe(1)

    const restarted = await session({ answers: [release('0.5.0')], saved: first.state.text, at: { time: 10 * DAY + DAY / 2 } })
    expect(restarted.updates.notice()?.version).toBe('0.4.0')
    expect((await restarted.updates.checkIfDue())?.version).toBe('0.4.0')
    expect(restarted.asked.count).toBe(0)

    restarted.at.time = 11 * DAY
    expect((await restarted.updates.checkIfDue())?.version).toBe('0.5.0')
    expect(restarted.asked.count).toBe(1)
  })

  it('asks again when the clock was set backwards', async () => {
    const { updates, asked, at } = await session({ answers: [release('0.4.0')] })
    await updates.checkIfDue()
    at.time = 2 * DAY
    await updates.checkIfDue()
    expect(asked.count).toBe(2)
  })

  it('is quiet when offline, and tries again next time', async () => {
    const { updates, asked } = await session({ answers: ['offline', 'offline', release('0.4.0')] })
    expect(await updates.checkIfDue()).toBeNull()
    expect(await updates.checkIfDue()).toBeNull()
    expect((await updates.checkIfDue())?.version).toBe('0.4.0')
    expect(asked.count).toBe(3)
  })

  it('never asks while checks are off, and hides a version already known', async () => {
    const known = await session({ answers: [release('0.4.0')] })
    await known.updates.checkIfDue()
    const off = await session({ answers: [release('0.5.0')], saved: known.state.text, enabled: false })
    expect(await off.updates.checkIfDue()).toBeNull()
    expect(off.updates.notice()).toBeNull()
    expect(off.asked.count).toBe(0)
    off.settings.enabled = true
    expect(off.updates.notice()?.version).toBe('0.4.0')
  })
})

describe('dismissing', () => {
  it('stops mentioning that version, but mentions a later one', async () => {
    const { updates, state, at } = await session({ answers: [release('0.4.0'), release('0.5.0')] })
    await updates.checkIfDue()
    await updates.dismiss('0.4.0')
    expect(updates.notice()).toBeNull()
    expect(parseUpdateState(state.text).dismissed).toBe('0.4.0')
    at.time += DAY
    expect((await updates.checkIfDue())?.version).toBe('0.5.0')
  })
})

describe('saving', () => {
  it('finishes every save before idle() resolves, in the order they were made', async () => {
    let open = (): void => undefined
    const gate = new Promise<void>((resolve) => (open = resolve))
    const writes: string[] = []
    const updates = await createUpdateSession({
      source: source(release('0.4.0')).latest,
      store: {
        read: async () => null,
        write: async (text) => (await gate, writes.push(text), ok(undefined)),
        setAside: async () => undefined,
      },
      currentVersion: '0.3.0',
      enabled: () => true,
      now: () => 0,
    })
    void updates.checkIfDue()
    void updates.dismiss('0.4.0')
    const idle = updates.idle()
    open()
    await idle
    expect(writes).toHaveLength(2)
    expect(parseUpdateState(writes.at(-1) ?? null).dismissed).toBe('0.4.0')
  })
})

describe('"Check for updates"', () => {
  it('asks even when checks are off or it asked today, and reports a dismissed version', async () => {
    const { updates, asked } = await session({ answers: [release('0.4.0')], enabled: false })
    await updates.dismiss('0.4.0')
    expect(await updates.checkNow()).toEqual({ kind: 'newer', release: release('0.4.0') })
    expect(await updates.checkNow()).toMatchObject({ kind: 'newer' })
    expect(asked.count).toBe(2)
  })

  it('says when this is the newest version, and when it couldn’t check', async () => {
    expect(await (await session({ answers: [release('0.3.0')] })).updates.checkNow()).toEqual({ kind: 'newest' })
    expect(await (await session({ answers: ['offline'] })).updates.checkNow()).toEqual({ kind: 'failed' })
  })
})

describe('saved state', () => {
  it('keeps a saved release', () => {
    expect(parseUpdateState(JSON.stringify({ checkedAt: 5, latest: release('0.4.0'), dismissed: '0.4.0' }))).toEqual({
      checkedAt: 5,
      latest: release('0.4.0'),
      dismissed: '0.4.0',
    })
  })

  it.each([
    null,
    '',
    'not json',
    '[]',
    '{"latest":{"version":"9.9.9"}}',
    JSON.stringify({ latest: { ...release('0.4.0'), download: {} } }),
  ])('starts afresh from %j', (text) => {
    expect(parseUpdateState(text)).toEqual({ checkedAt: null, latest: null, dismissed: null })
  })
})
