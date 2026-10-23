import '../app/global.css'

import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import App from '../app/App.vue'
import { useCaptureStore } from '../app/capture-store'
import { useEditorStore } from '../app/editor-store'
import { createFakePlotDeviceApi } from '../app/fake-plot-device-api'
import { usePaletteStore } from '../app/palette-store'
import { usePeekStore } from '../app/peek-store'
import { plotDeviceApi } from '../app/plot-device-api'
import { useUiLanguageStore } from '../app/ui-language-store'
import { useWorkbenchNavigation } from '../app/use-workbench-navigation'
import { useWorkbenchStore } from '../app/workbench-store'
import { useWorkspaceStore } from '../app/workspace-store'
import { useWritingPreferencesStore } from '../app/writing-preferences-store'
import { enrichSample } from './preview-sample'
import { parseScenario, type ScenarioName } from './scenarios'

/*
 * A dev-only page that runs the real app on invented sample data in a browser, so screens can be
 * captured for design reviews (U1, U2). It is never part of the app build.
 */

const settle = (ms = 120): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function click(selector: string): void {
  document.querySelector<HTMLElement>(selector)?.click()
}

async function show(name: ScenarioName): Promise<void> {
  const workspace = useWorkspaceStore()
  if (name === 'welcome') return
  if (name === 'initialize') {
    await workspace.useFolder({ root: '/novels/new-book', name: 'new-book', isProject: false })
    return
  }
  await workspace.openProject('/novels/salt-orchard')
  await settle(300)
  const editor = useEditorStore()
  const navigation = useWorkbenchNavigation()
  const workbench = useWorkbenchStore()
  await editor.open('The Ferry.md')
  await settle()

  switch (name) {
    case 'revise':
      await navigation.switchLayout('revise')
      await navigation.openBeside('First frost.md')
      break
    case 'focus':
      workbench.focusMode = true
      break
    case 'palette':
      usePaletteStore().show()
      break
    case 'dock-menu':
      click(`[aria-label="${useUiLanguageStore().t('workbench-area-options')}"]`)
      break
    case 'peek': {
      const width = window.innerWidth
      usePeekStore().show(
        'characters/Ilka.md',
        { left: width / 2, top: 300, right: width / 2 + 60, bottom: 320 },
        false
      )
      break
    }
    case 'cards':
      workbench.pinCard('characters/Ilka.md')
      workbench.pinCard('locations/Marrow.md')
      navigation.revealView('card-stack')
      break
    case 'overview':
    case 'timeline':
    case 'interactions':
      await navigation.showCenterView(name)
      break
    case 'board':
    case 'board-card-menu':
    case 'board-add-card':
      await navigation.switchMode('plotting')
      await settle(300)
      if (name === 'board-card-menu') click('.beat .more button')
      if (name === 'board-add-card') click('.add-card')
      break
    case 'capture':
      useWritingPreferencesStore().setCaptureBeats(true)
      useCaptureStore().show()
      break
    case 'appearance':
      click('.appearance-trigger')
      break
    case 'select-open':
      click('#inspector-status')
      break
    case 'writing':
      break
  }
}

async function start(): Promise<void> {
  const scenario = parseScenario(window.location.search)
  // A fresh browser profile for every capture: nothing from an earlier scenario carries over.
  localStorage.clear()
  const fake = createFakePlotDeviceApi()
  enrichSample(fake)
  plotDeviceApi.current = () => fake.api
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = createApp(App).use(pinia)
  const language = useUiLanguageStore(pinia)
  await language.initialize()
  if (scenario.lang === 'he') await language.change('he')
  app.mount('#app')
  await settle()
  await show(scenario.name)
  await settle(400)
  document.body.dataset['previewReady'] = scenario.name
}

void start().catch((error: unknown) => {
  console.error('The preview could not start.', error)
})
