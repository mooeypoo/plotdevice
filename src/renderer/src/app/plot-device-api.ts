import type { PlotDeviceApi } from '../../../contract/api'

/**
 * Where the renderer gets the main-process API. Stores call `plotDeviceApi.current()` instead of
 * reading `window.plotDevice` directly, so tests can swap in a fake.
 */
export const plotDeviceApi: { current: () => PlotDeviceApi } = {
  current: () => window.plotDevice
}
