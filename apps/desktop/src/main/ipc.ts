import { channels, preferencesPatchSchema, type AppInfo, type Preferences, type PreferencesPatch } from '@plotdevice/contracts'
import type { Result } from '@plotdevice/shared'

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
}

/** A refused request. Only its message crosses to the renderer, never a stack or internals. */
export class IpcRefused extends Error {}

export type IpcHandler = (sender: Sender, payload: unknown) => Promise<unknown>

/**
 * The handlers behind `PlotDeviceApi`. Every request must come from the app's own page, and every
 * payload is validated, because the renderer is treated as untrusted.
 */
export function createIpcHandlers(context: IpcContext): Record<string, IpcHandler> {
  const requireAppPage = (sender: Sender): void => {
    if (!sender.fromAppWindow || !isAppUrl(sender.url, context.appUrl)) throw new IpcRefused('untrusted-sender')
  }
  return {
    [channels.getAppInfo]: async (sender) => {
      requireAppPage(sender)
      return context.appInfo
    },
    [channels.getPreferences]: async (sender) => {
      requireAppPage(sender)
      return context.currentPreferences()
    },
    [channels.setPreferences]: async (sender, payload) => {
      requireAppPage(sender)
      const patch = preferencesPatchSchema.safeParse(payload)
      if (!patch.success) throw new IpcRefused('invalid-payload')
      const saved = await context.updatePreferences(patch.data)
      if (!saved.ok) throw new IpcRefused(`save-failed:${saved.error}`)
      return saved.value
    },
  }
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
