import { mountApp } from '@plotdevice/ui-vue'

const element = document.getElementById('app')
if (!element) throw new Error('index.html is missing #app')
mountApp(element, window.plotDevice)
