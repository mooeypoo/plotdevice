import type { PlotDeviceApi } from '@plotdevice/contracts'
import { createApp } from 'vue'
import App from './App.vue'
import './styles/base.css'

/** Starts the interface in `element`, talking to the host only through `api`. */
export function mountApp(element: Element, api: PlotDeviceApi): void {
  createApp(App, { api }).mount(element)
}
