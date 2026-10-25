import type { PlotDeviceApi } from '@plotdevice/contracts'
import { createApp } from 'vue'
import App from './App.vue'
import './styles/base.css'

/** Starts the interface in `element`, talking to the host only through `api`. */
export function mountApp(element: Element, api: PlotDeviceApi): void {
  // Nothing waits to be saved yet; the writing view will send its pending text first (Milestone 3, step 3).
  api.onEvent((event) => {
    if (event.kind === 'flush') void api.flushed()
  })
  createApp(App, { api }).mount(element)
}
