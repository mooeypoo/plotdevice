import type { PlotDeviceApi } from '@plotdevice/contracts'

declare global {
  interface Window {
    /** Exposed by the preload script; the page's only way to reach the host. */
    plotDevice: PlotDeviceApi
  }
}
