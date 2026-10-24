import './app/global.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './app/App.vue'
import { useUiLanguageStore } from './app/ui-language-store'
import { useUiThemeStore } from './app/ui-theme-store'

async function start(): Promise<void> {
  const pinia = createPinia()
  const app = createApp(App).use(pinia)
  await Promise.all([useUiLanguageStore(pinia).initialize(), useUiThemeStore(pinia).initialize()])
  app.mount('#app')
}

void start().catch((error: unknown) => {
  console.error('Could not initialize Plot Device.', error)
  const host = document.getElementById('app')
  if (host !== null) {
    host.setAttribute('role', 'alert')
    host.textContent = 'Plot Device could not start. Please restart the app.'
  }
})
