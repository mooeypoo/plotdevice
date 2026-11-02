import { createUpdateSession } from '@plotdevice/application'
import { channels, type LatestRelease } from '@plotdevice/contracts'
import { ok } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { createUpdateHandlers } from './update-ipc'

const latest: LatestRelease = {
  format: 1,
  version: '0.4.0',
  date: '2026-11-20',
  notes: 'https://github.com/mooeypoo/plotdevice/releases/tag/v0.4.0',
  download: { en: 'https://mooeypoo.github.io/plotdevice/start/install/' },
}

async function handlers() {
  let saved: string | null = null
  const updates = await createUpdateSession({
    source: { latest: async () => ok(latest) },
    store: { read: async () => saved, write: async (text) => ((saved = text), ok(undefined)), setAside: async () => undefined },
    currentVersion: '0.3.0',
    enabled: () => true,
    now: () => 0,
  })
  const all = createUpdateHandlers({ updates })
  return (channel: string, payload?: unknown) => {
    const handle = all[channel]
    if (!handle) throw new Error(`no handler for ${channel}`)
    return handle(payload)
  }
}

describe('update notices over IPC', () => {
  it('reports a newer version without its format or date, and forgets it once dismissed', async () => {
    const call = await handlers()
    const update = { version: '0.4.0', notes: latest.notes, download: latest.download }
    expect(await call(channels.checkForUpdates)).toEqual({ kind: 'newer', update })
    expect(await call(channels.getUpdate)).toEqual(update)
    await call(channels.dismissUpdate, { version: '0.4.0' })
    expect(await call(channels.getUpdate)).toBeNull()
  })

  it.each([[{ version: 'latest' }], [{ version: '0.4.0', extra: 1 }], [undefined]])('refuses to dismiss %j', async (payload) => {
    await expect((await handlers())(channels.dismissUpdate, payload)).rejects.toThrow('invalid-payload')
  })
})
