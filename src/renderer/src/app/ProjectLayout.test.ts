// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useLayoutStore } from './layout-store'
import { plotDeviceApi } from './plot-device-api'
import ProjectLayout from './ProjectLayout.vue'
import { useWorkspaceStore } from './workspace-store'
import { useWritingPreferencesStore } from './writing-preferences-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { useUiLanguageStore } from './ui-language-store'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const mountLayout = () =>
  mount(ProjectLayout, {
    global: {
      stubs: { TopBar: true, EditorPane: true, SidePanel: true, RightPanel: true, StatusBar: true }
    }
  })

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
})

describe('ProjectLayout writing preferences', () => {
  it('retranslates a tab-storage notice while retaining the conflicted draft and tab focus', async () => {
    localStorage.setItem('plotdevice.documentTabs', '{')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mount(ProjectLayout, {
      attachTo: document.body,
      global: {
        stubs: {
          TopBar: true,
          EditorPane: true,
          SidePanel: true,
          RightPanel: true,
          StatusBar: true
        }
      }
    })
    await flushPromises()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('טיוטה שלא נשמרה / unsaved draft')
    editor.saveState = 'conflict'
    await flushPromises()
    expect(wrapper.get('.navigation-notice[role=status]').text()).toContain('invalid')
    const tab = wrapper.get<HTMLButtonElement>('[role=tab]').element
    tab.focus()
    const tabs = useDocumentTabsStore()
    const documents = tabs.documents
    const storage = localStorage
    const get = vi.fn((key: string) => storage.getItem(key))
    const set = vi.fn((key: string, value: string) => { storage.setItem(key, value); })
    vi.stubGlobal('localStorage', { getItem: get, setItem: set })
    const open = vi.spyOn(editor, 'open')
    const api = plotDeviceApi.current()
    const read = vi.spyOn(api.manuscript, 'openEntry')
    const write = vi.spyOn(api.manuscript, 'saveEntryText')
    warn.mockClear()
    useUiLanguageStore().locale = 'he'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.navigation-notice[role=status]').text()).not.toContain('invalid')
    expect(wrapper.get('.navigation-notice[role=status]').text()).toContain('אינן תקינות')
    expect(wrapper.get('[role=tab]').element).toBe(tab)
    expect(document.activeElement).toBe(tab)
    expect(tabs.documents).toBe(documents)
    expect(editor.text).toBe('טיוטה שלא נשמרה / unsaved draft')
    expect(editor.saveState).toBe('conflict')
    expect(open).not.toHaveBeenCalled()
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    useLayoutStore().focusMode = true
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.navigation-notice[role=status]').text()).toContain('אינן תקינות')
    wrapper.unmount()
  })

  it('restores active tabs and Writing only after project listings have loaded', async () => {
    const root = useWorkspaceStore().project?.root
    if (root === undefined) throw new Error('Expected project')
    localStorage.setItem(
      'plotdevice.documentTabs',
      JSON.stringify({
        version: 1,
        projects: {
          [root]: {
            documents: [
              { path: 'The Ferry.md', pinned: true, temporary: false },
              { path: 'First frost.md', pinned: false, temporary: true }
            ],
            activePath: 'First frost.md',
            writingPath: 'The Ferry.md'
          }
        }
      })
    )
    const wrapper = mountLayout()
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('First frost.md')
    expect(useDocumentTabsStore().writingPath).toBe('The Ferry.md')
    expect(useDocumentTabsStore().writing?.pinned).toBe(true)
    wrapper.unmount()
  })

  it('does not restore or reopen documents after an unfinished layout has unmounted', async () => {
    let release: () => void = () => {
      throw new Error('Load not started')
    }
    const load = vi.spyOn(useManuscriptStore(), 'load').mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
    })
    const restore = vi.spyOn(useDocumentTabsStore(), 'restore')
    const wrapper = mountLayout()
    await flushPromises()
    wrapper.unmount()
    release()
    await flushPromises()
    expect(restore).not.toHaveBeenCalled()
    load.mockRestore()
    restore.mockRestore()
  })

  it('applies live typography to the writing surface and preserves it in focus mode', async () => {
    const wrapper = mount(ProjectLayout, {
      global: {
        stubs: {
          TopBar: true,
          EditorPane: true,
          SidePanel: true,
          RightPanel: true,
          StatusBar: true
        }
      }
    })
    await flushPromises()
    const layout = wrapper.get('.layout').element
    if (!(layout instanceof HTMLElement)) throw new Error('Expected a layout element')
    expect(layout.style.getPropertyValue('--prose-size')).toBe('19px')
    expect(layout.style.getPropertyValue('--measure')).toBe('66ch')
    const preferences = useWritingPreferencesStore()
    preferences.setFontSize(23)
    preferences.setLineWidth(75)
    await wrapper.vm.$nextTick()
    expect(layout.style.getPropertyValue('--prose-size')).toBe('23px')
    expect(layout.style.getPropertyValue('--measure')).toBe('75ch')
    useLayoutStore().toggleFocusMode()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.layout').classes()).toContain('focus')
    expect(layout.style.getPropertyValue('--prose-size')).toBe('23px')
    expect(layout.style.getPropertyValue('--measure')).toBe('75ch')
    wrapper.unmount()
  })
})
