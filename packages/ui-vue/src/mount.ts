import type { PlotDeviceApi } from '@plotdevice/contracts'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { apiKey } from './api'
import App from './App.vue'
import { answerFlushRequests } from './closing'
import './styles/base.css'

/** Starts the interface in `element`, talking to the host only through `api`. */
export function mountApp(element: Element, api: PlotDeviceApi): void {
  answerFlushRequests(api)
  createApp(App).use(createPinia()).provide(apiKey, api).mount(element)
}
