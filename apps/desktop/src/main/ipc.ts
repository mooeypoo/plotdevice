import { channels, preferencesPatchSchema, type AppInfo, type Preferences, type PreferencesPatch } from '@plotdevice/contracts'
import type { Result } from '@plotdevice/shared'
import { IpcRefused, parsePayload } from './payload'
import { createOutlineHandlers, type OutlineIpcContext } from './outline-ipc'
import { createProjectHandlers, type PayloadHandler, type ProjectIpcContext } from './project-ipc'
import { createReferenceHandlers, type ReferenceIpcContext } from './reference-ipc'
import { createVersionHandlers, type VersionIpcContext } from './version-ipc'

/** What the main process knows about who sent a request. */
export interface Sender {
  /** URL of the frame that sent it. */
  url: string | undefined
  /** Whether it came from the app's own window, not some other web contents. */
  fromAppWindow: boolean
}

export interface IpcContext {
  appUrl: string
  appInfo: AppInfo
  currentPreferences(): Preferences
  updatePreferences(patch: PreferencesPatch): Promise<Result<Preferences, string>>
  projects: ProjectIpcContext
  outlines: OutlineIpcContext
  references: ReferenceIpcContext
  versions: VersionIpcContext
}

export type IpcHandler = (sender: Sender, payload: unknown) => Promise<unknown>

/**
 * The handlers behind `PlotDeviceApi`. Every request must come from the app's own page, and every
 * payload is validated, because the renderer is treated as untrusted.
 */
export function createIpcHandlers(context: IpcContext): Record<string, IpcHandler> {
  const handlers: Record<string, PayloadHandler> = {
    [channels.getAppInfo]: async () => context.appInfo,
    [channels.getPreferences]: async () => context.currentPreferences(),
    [channels.setPreferences]: async (payload) => {
      const saved = await context.updatePreferences(parsePayload(preferencesPatchSchema, payload))
      if (!saved.ok) throw new IpcRefused(`save-failed:${saved.error}`)
      return saved.value
    },
    ...createProjectHandlers(context.projects),
    ...createOutlineHandlers(context.outlines),
    ...createReferenceHandlers(context.references),
    ...createVersionHandlers(context.versions),
  }
  return Object.fromEntries(
    Object.entries(handlers).map(([channel, handle]) => [
      channel,
      async (sender: Sender, payload: unknown) => {
        if (!sender.fromAppWindow || !isAppUrl(sender.url, context.appUrl)) throw new IpcRefused('untrusted-sender')
        return handle(payload)
      },
    ]),
  )
}

/** Same document as the app's page: same file for `file:` URLs, same origin for the dev server. */
export function isAppUrl(url: string | undefined, appUrl: string): boolean {
  if (!url) return false
  try {
    const actual = new URL(url)
    const expected = new URL(appUrl)
    return expected.protocol === 'file:' ? actual.protocol === 'file:' && actual.pathname === expected.pathname : actual.origin === expected.origin
  } catch {
    return false
  }
}
