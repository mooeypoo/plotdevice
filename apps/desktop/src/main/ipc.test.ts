import { channels, type Preferences } from '@plotdevice/contracts'
import { err, ok } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { createIpcHandlers, isAppUrl, type Sender } from './ipc'
import type { OutlineIpcContext } from './outline-ipc'
import type { ProjectIpcContext } from './project-ipc'
import type { ReferenceIpcContext } from './reference-ipc'
import type { VersionIpcContext } from './version-ipc'

const MEDIUM_PAGE = { writingSize: 'medium', pageWidth: 'medium' } as const

const appUrl = 'file:///opt/plotdevice/out/renderer/index.html'
const appPage: Sender = { url: `${appUrl}?x=1#top`, fromAppWindow: true }

function setup(saveError?: string) {
  let current: Preferences = { theme: 'system', locale: 'en', ...MEDIUM_PAGE }
  const handlers = createIpcHandlers({
    appUrl,
    appInfo: { name: 'Plot Device', version: '0.1.0', platform: 'linux' },
    about: async () => ({ name: 'Plot Device', version: '0.1.0', licenseText: '', thirdParty: [] }),
    currentPreferences: () => current,
    updatePreferences: async (patch) => {
      if (saveError) return err(saveError)
      current = { ...current, ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) }
      return ok(current)
    },
    // Project calls are covered in project-ipc.test.ts.
    projects: {} as ProjectIpcContext,
    outlines: {} as OutlineIpcContext,
    references: {} as ReferenceIpcContext,
    versions: {} as VersionIpcContext,
  })
  const call = (channel: string, sender: Sender, payload?: unknown) => {
    const handler = handlers[channel]
    if (!handler) throw new Error(`no handler for ${channel}`)
    return handler(sender, payload)
  }
  return { call, current: () => current }
}

describe('IPC handlers', () => {
  it('serve the app page', async () => {
    const { call } = setup()
    expect(await call(channels.getPreferences, appPage)).toEqual({ theme: 'system', locale: 'en', ...MEDIUM_PAGE })
    expect(await call(channels.setPreferences, appPage, { locale: 'he' })).toEqual({ theme: 'system', locale: 'he', ...MEDIUM_PAGE })
  })

  it.each([
    [{ url: 'https://example.com/', fromAppWindow: true }],
    [{ url: 'file:///home/someone/evil.html', fromAppWindow: true }],
    [{ url: appUrl, fromAppWindow: false }],
    [{ url: undefined, fromAppWindow: true }],
  ])('refuse a request from anywhere else: %j', async (sender) => {
    const { call } = setup()
    await expect(call(channels.getPreferences, sender)).rejects.toThrow('untrusted-sender')
  })

  it.each([[{ theme: 'neon' }], [{ fontSize: 30 }], ['dark'], [null]])('refuse an invalid payload, changing nothing: %j', async (payload) => {
    const { call, current } = setup()
    await expect(call(channels.setPreferences, appPage, payload)).rejects.toThrow('invalid-payload')
    expect(current()).toEqual({ theme: 'system', locale: 'en', ...MEDIUM_PAGE })
  })

  it('report a failed save instead of pretending it worked', async () => {
    const { call } = setup('read-only')
    await expect(call(channels.setPreferences, appPage, { theme: 'dark' })).rejects.toThrow('save-failed:read-only')
  })
})

describe('isAppUrl', () => {
  it('matches the dev server by origin', () => {
    expect(isAppUrl('http://localhost:5173/#/x', 'http://localhost:5173/')).toBe(true)
    expect(isAppUrl('http://localhost:5174/', 'http://localhost:5173/')).toBe(false)
  })
})
