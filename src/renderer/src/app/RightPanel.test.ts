// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'
import RightPanel from './RightPanel.vue'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

const mountPanel = (): ReturnType<typeof mount> =>
  mount(RightPanel, {
    global: { stubs: { OutlinePanel: { template: '<div class="outline-stub" />' } } }
  })

describe('RightPanel', () => {
  it('switches between properties and the outline, remembering the tab', async () => {
    await useEditorStore().open('First frost.md')
    const panel = mountPanel()
    await flushPromises()
    expect(panel.find('#inspector-title').exists()).toBe(true)

    const outlineTab = panel.findAll('[role=tab]').find((tab) => tab.text() === 'Outline')
    await outlineTab?.trigger('click')
    expect(panel.find('.outline-stub').exists()).toBe(true)
    expect(useLayoutStore().rightTab).toBe('outline')
  })

  it('toggles the outline with its shortcut action', () => {
    const layout = useLayoutStore()
    layout.inspectorOpen = true
    layout.rightTab = 'properties'
    layout.toggleOutline()
    expect([layout.inspectorOpen, layout.rightTab]).toEqual([true, 'outline'])
    layout.toggleOutline()
    expect(layout.inspectorOpen).toBe(false)
  })

  it('says what the properties tab is for when nothing is open', () => {
    useLayoutStore().rightTab = 'properties'
    expect(mountPanel().text()).toContain('Open a chapter or codex entry')
  })

  it('translates tab, resize, expand and empty-state accessibility live', async () => {
    const layout = useLayoutStore()
    layout.rightTab = 'outline'
    const panel = mountPanel()
    const language = useUiLanguageStore()
    expect(panel.get('[role=tablist]').attributes('aria-label')).toBe('Right panel')
    expect(panel.findAll('[role=tab]').map((tab) => tab.text())).toEqual([
      'Properties',
      'Outline',
      'Reference'
    ])
    expect(panel.get('[role=separator]').attributes('aria-label')).toBe('Outline panel width')
    expect(panel.get('.expand').text()).toBe('Expand')

    await language.change('he')
    await flushPromises()
    expect(panel.get('[role=tablist]').attributes('aria-label')).toBe('החלונית הימנית')
    expect(panel.findAll('[role=tab]').map((tab) => tab.text())).toEqual([
      'מאפיינים',
      'מתווה',
      'עיון'
    ])
    expect(panel.get('[role=separator]').attributes('aria-label')).toBe('רוחב חלונית המתווה')
    expect(panel.get('.expand').text()).toBe('הרחבה')
    await panel.get('.expand').trigger('click')
    expect(panel.get('.expand').text()).toBe('שחזור')

    layout.rightTab = 'properties'
    await flushPromises()
    expect(panel.find('[role=separator]').exists()).toBe(false)
    expect(panel.text()).toContain('יש לפתוח פרק או רשומה בקודקס כדי לראות את המאפיינים שלה.')
    await language.change('en')
    await flushPromises()
    expect(panel.get('[role=tablist]').attributes('aria-label')).toBe('Right panel')
    expect(panel.text()).toContain('Open a chapter or codex entry to see its properties.')
    panel.unmount()
  })

  it('navigates all three tabs by keyboard and labels the independent panel', async () => {
    const panel = mountPanel()
    const tabs = panel.findAll('[role=tab]')
    expect(tabs.map((tab) => tab.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    await tabs[0]?.trigger('keydown', { key: 'End' })
    expect(useLayoutStore().rightTab).toBe('reference')
    expect(panel.get('[role=tabpanel]').attributes('aria-labelledby')).toBe('right-tab-reference')
    expect(panel.text()).toContain('Keep the story close')
    await tabs[2]?.trigger('keydown', { key: 'ArrowRight' })
    expect(useLayoutStore().rightTab).toBe('properties')
    await tabs[0]?.trigger('keydown', { key: 'ArrowLeft' })
    expect(useLayoutStore().rightTab).toBe('reference')
    await tabs[2]?.trigger('keydown', { key: 'Home' })
    expect(useLayoutStore().rightTab).toBe('properties')
    panel.unmount()
  })
})
