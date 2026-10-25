import type { AppInfo } from './app-info'
import type { Preferences, PreferencesPatch } from './preferences'

/** Everything the renderer may ask of the host. Exposed as `window.plotDevice` by the preload script. */
export interface PlotDeviceApi {
  getAppInfo(): Promise<AppInfo>
  getPreferences(): Promise<Preferences>
  /** Applies the change, saves it, and returns the settings now in effect. */
  setPreferences(patch: PreferencesPatch): Promise<Preferences>
}
