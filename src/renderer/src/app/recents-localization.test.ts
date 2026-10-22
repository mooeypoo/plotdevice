// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiError, ApiResult, RecentProjectDto } from '../../../contract/dtos'
import { createFakePlotDeviceApi, sampleSummary } from './fake-plot-device-api'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'
import { useUiLanguageStore } from './ui-language-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import WelcomeScreen from '../features/welcome/WelcomeScreen.vue'
import ProjectLayout from './ProjectLayout.vue'
import { useWorkbenchStore } from './workbench-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
const failure: ApiError = {
  code: 'recents-read-failed',
  message: 'Legacy',
  diagnostic: {
    reason: 'recents-read-failed',
    path: '/settings/יעל <img>.json',
    detail: 'EACCES <img src=x>'
  }
}
const entries: readonly RecentProjectDto[] = [
  { root: '/book', title: 'יעל Book', lastOpenedAt: '', available: true }
]
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})

describe('recent-project notices', () => {
  it('keeps the last list and mounted welcome controls while cached failures retranslate', async () => {
    const workspace = useWorkspaceStore()
    const list = vi
      .spyOn(fake.api.workspace, 'listRecentProjects')
      .mockResolvedValueOnce({ ok: true, value: entries })
      .mockResolvedValue({ ok: false, error: failure })
    await workspace.loadRecents()
    const wrapper = mount(WelcomeScreen, { attachTo: document.body })
    await flushPromises()
    await workspace.loadRecents()
    const alert = wrapper.get('[data-testid=recents-load-error]')
    const english = alert.text()
    const button = wrapper.get<HTMLButtonElement>('button.primary').element
    button.focus()
    const writes = vi.spyOn(fake.api.workspace, 'removeRecentProject')
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(alert.text()).not.toBe(english)
    expect(alert.text()).toContain('\u2068/settings/יעל <img>.json\u2069')
    expect(alert.text()).toContain('\u2068EACCES <img src=x>\u2069')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(document.activeElement).toBe(button)
    expect(wrapper.get('button.primary').element).toBe(button)
    expect(workspace.recents).toEqual(entries)
    expect(list).toHaveBeenCalledTimes(2)
    expect(writes).not.toHaveBeenCalled()
    list.mockResolvedValue({ ok: true, value: entries })
    await workspace.loadRecents()
    await flushPromises()
    expect(wrapper.find('[data-testid=recents-load-error]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('reports removal independently, keeps the list, and clears only after a successful retry', async () => {
    const workspace = useWorkspaceStore()
    const list = vi
      .spyOn(fake.api.workspace, 'listRecentProjects')
      .mockResolvedValue({ ok: true, value: entries })
    await workspace.loadRecents()
    const remove = vi
      .spyOn(fake.api.workspace, 'removeRecentProject')
      .mockResolvedValueOnce({ ok: false, error: failure })
    await workspace.removeRecent('/book')
    expect(workspace.recents).toEqual(entries)
    expect(list).toHaveBeenCalledTimes(1)
    expect(workspace.recentsRemoveErrorMessage).not.toBeNull()
    useUiLanguageStore().locale = 'he'
    expect(workspace.recentsRemoveErrorMessage).not.toContain('Legacy')
    await workspace.loadRecents()
    expect(workspace.recentsRemoveErrorMessage).not.toBeNull()
    remove.mockResolvedValue({ ok: true, value: null })
    await workspace.removeRecent('/book')
    expect(workspace.recentsRemoveErrorMessage).toBeNull()
  })

  it.each(['success', 'failure'] as const)(
    'rejects obsolete list %s after a newer request',
    async (outcome) => {
      const workspace = useWorkspaceStore()
      let finish: ((result: ApiResult<readonly RecentProjectDto[]>) => void) | undefined
      vi.spyOn(fake.api.workspace, 'listRecentProjects')
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve
            })
        )
        .mockResolvedValue({ ok: true, value: entries })
      const old = workspace.loadRecents()
      await workspace.loadRecents()
      if (finish === undefined) throw new Error('Missing request')
      finish(outcome === 'failure' ? { ok: false, error: failure } : { ok: true, value: [] })
      await old
      expect(workspace.recents).toEqual(entries)
      expect(workspace.recentsLoadErrorMessage).toBeNull()
    }
  )

  it('keeps failed removal visible on the welcome screen across a language switch', async () => {
    const workspace = useWorkspaceStore()
    vi.spyOn(fake.api.workspace, 'listRecentProjects').mockResolvedValue({
      ok: true,
      value: entries
    })
    await workspace.loadRecents()
    const remove = vi
      .spyOn(fake.api.workspace, 'removeRecentProject')
      .mockResolvedValue({ ok: false, error: failure })
    const wrapper = mount(WelcomeScreen)
    await wrapper.get('.recents .remove').trigger('click')
    await flushPromises()
    const english = wrapper.get('[data-testid=recents-remove-error]').text()
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(wrapper.get('[data-testid=recents-remove-error]').text()).not.toBe(english)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.findAll('.recents li')).toHaveLength(1)
    expect(remove).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('invalidates a list in flight before removal and refreshes after success', async () => {
    const workspace = useWorkspaceStore()
    let finish: ((result: ApiResult<readonly RecentProjectDto[]>) => void) | undefined
    vi.spyOn(fake.api.workspace, 'listRecentProjects')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValue({ ok: true, value: [] })
    const previous = workspace.loadRecents()
    await workspace.removeRecent('/book')
    if (finish === undefined) throw new Error('Missing request')
    finish({ ok: true, value: entries })
    await previous
    expect(workspace.recents).toEqual([])
  })

  it('shows initialization recording warnings and clears them only when closing or opening again', async () => {
    const workspace = useWorkspaceStore()
    workspace.chosenFolder = { root: '/book', name: 'Book', isProject: false }
    vi.spyOn(fake.api.workspace, 'initializeProject').mockResolvedValue({
      ok: true,
      value: { ...sampleSummary, recentProjectsError: failure }
    })
    await workspace.initializeChosenFolder('Book', 'en')
    expect(workspace.screen).toBe('project')
    expect(workspace.rememberErrorMessage).not.toBeNull()
    await workspace.backToWelcome()
    expect(workspace.rememberErrorMessage).toBeNull()
    await workspace.openProject('/book')
    expect(workspace.rememberErrorMessage).toBeNull()
  })

  it('opens with a separate warning that project refresh or a successful list read cannot hide', async () => {
    vi.spyOn(fake.api.workspace, 'openProject').mockResolvedValue({
      ok: true,
      value: { ...sampleSummary, recentProjectsError: failure }
    })
    const workspace = useWorkspaceStore()
    await workspace.openProject('/book')
    expect(workspace.screen).toBe('project')
    expect(workspace.errorMessage).toBeNull()
    expect(workspace.rememberErrorMessage).not.toBeNull()
    await workspace.refresh()
    await workspace.loadRecents()
    expect(workspace.rememberErrorMessage).not.toBeNull()
    await useManuscriptStore().load()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('טיוטה unsaved')
    editor.saveState = 'conflict'
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
    const english = wrapper.get('[data-testid=recents-remember-error]').text()
    const open = vi.spyOn(fake.api.workspace, 'openProject')
    const read = vi.spyOn(fake.api.workspace, 'refreshProject')
    const write = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    open.mockClear()
    read.mockClear()
    useWorkbenchStore().focusMode = true
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(wrapper.get('[data-testid=recents-remember-error]').text()).not.toBe(english)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(editor.text).toBe('טיוטה unsaved')
    expect(open).not.toHaveBeenCalled()
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
