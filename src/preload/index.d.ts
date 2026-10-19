import type { PlotDeviceApi } from '../contract/api'

declare global {
  interface Window {
    readonly plotDevice: PlotDeviceApi
  }
}
