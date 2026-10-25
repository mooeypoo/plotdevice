import type { PlotDeviceApi } from '@plotdevice/contracts'
import { inject, type InjectionKey } from 'vue'

export const apiKey: InjectionKey<PlotDeviceApi> = Symbol('plotDevice')

/** The host API, provided once by `mountApp`. */
export function useApi(): PlotDeviceApi {
  const api = inject(apiKey)
  if (!api) throw new Error('The host API was not provided')
  return api
}
