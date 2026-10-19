import './app/global.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './app/App.vue'

createApp(App).use(createPinia()).mount('#app')
