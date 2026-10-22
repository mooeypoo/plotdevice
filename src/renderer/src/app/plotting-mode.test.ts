// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseWorkbenchProjects } from '../workbench/model/workbench-settings'
import { useCodexStore } from './codex-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useManuscriptStore } from './manuscript-store'
import { useOutlineStore } from './outline-store'
import { plotDeviceApi } from './plot-device-api'
import TopBar from './TopBar.vue'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore } from './workbench-store'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load(), useOutlineStore().load()])
  useDocumentTabsStore().restore('/book')
})

describe('the mode in project bindings', () => {
  it('reads bindings saved before modes existed as Writing', () => {
    const parsed = parseWorkbenchProjects({
      version: 1,
      projects: {
        '/book': {
          active: { writing: 'revise', plotting: 'plot' },
          pins: {},
          cards: [],
          splits: {},
          outlinePath: null
        }
      }
    })
    expect(parsed?.projects['/book']?.mode).toBe('writing')
  })

  it('keeps a layout choice per mode, and the board in the Plot layout', async () => {
    const workbench = useWorkbenchStore()
    const navigation = useWorkbenchNavigation()
    expect(await navigation.switchLayout('revise')).toBe(true)
    expect(await navigation.switchMode('plotting')).toBe(true)
    expect(workbench.activeLayoutId).toBe('plot')
    expect(useWorkbenchStore().centerView).toBe('plot-board')
    expect(await navigation.switchMode('writing')).toBe(true)
    expect(workbench.activeLayoutId).toBe('revise')
  })
})

describe('switching modes', () => {
  it('saves the draft first, and is refused while a recovery decision is pending', async () => {
    const editor = useEditorStore()
    const navigation = useWorkbenchNavigation()
    await editor.open('First frost.md')
    editor.edit('Typed just now.')
    expect(await navigation.switchMode('plotting')).toBe(true)
    expect(fake.files.get('First frost.md')).toBe('Typed just now.')

    expect(await navigation.switchMode('writing')).toBe(true)
    editor.edit('Mine.')
    fake.files.set('First frost.md', 'Outside.')
    await editor.flush()
    expect(editor.saveState).toBe('conflict')
    expect(await navigation.switchMode('plotting')).toBe(false)
    expect(useWorkbenchStore().mode).toBe('writing')
    expect(editor.text).toBe('Mine.')
  })

  it('shows the outline as text in Plotting, and returns to the chapter in Writing', async () => {
    const editor = useEditorStore()
    const navigation = useWorkbenchNavigation()
    await editor.open('First frost.md')
    await navigation.switchMode('plotting')
    expect(await navigation.showOutlineText()).toBe(true)
    expect(editor.entry?.path).toBe('Outline.md')
    expect(useWorkbenchStore().centerView).toBe('write')
    expect(useWorkbenchStore().mode).toBe('plotting')
    expect(await navigation.showCenterView('plot-board')).toBe(true)
    expect(await navigation.switchMode('writing')).toBe(true)
    expect(editor.entry?.path).toBe('First frost.md')
  })

  it('goes back to Writing when another document opens while plotting', async () => {
    const navigation = useWorkbenchNavigation()
    await navigation.switchMode('plotting')
    await useEditorStore().open('The Ferry.md')
    expect(useWorkbenchStore().mode).toBe('writing')
    expect(useWorkbenchStore().centerView).toBe('write')
  })
})

describe('the top bar', () => {
  it('offers Board and Text while plotting, and Write while writing', async () => {
    const bar = mount(TopBar)
    const tabs = (): string[] => bar.findAll('[role="tab"]').map((tab) => tab.text())
    expect(tabs()).toEqual(['Write', 'Overview', 'Timeline', 'Interactions'])
    const modes = bar.findAll('.mode-switch button')
    expect(modes.map((button) => button.text())).toEqual(['Writing', 'Plotting'])
    await modes[1]?.trigger('click')
    await flushPromises()
    expect(tabs()).toEqual(['Board', 'Text', 'Overview', 'Timeline', 'Interactions'])
    expect(bar.get('.mode-switch button[aria-pressed="true"]').text()).toBe('Plotting')
    await useUiLanguageStore().change('he')
    expect(tabs().slice(0, 2)).toEqual(['לוח', 'טקסט'])
    bar.unmount()
  })
})
