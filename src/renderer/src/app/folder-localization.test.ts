// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiError, ApiResult, FolderChoiceDto } from '../../../contract/dtos'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'
import { useUiLanguageStore } from './ui-language-store'
import { useManuscriptStore } from './manuscript-store'
import { useEditorStore } from './editor-store'
import WelcomeScreen from '../features/welcome/WelcomeScreen.vue'
import InitializePrompt from '../features/welcome/InitializePrompt.vue'
import ProjectLayout from './ProjectLayout.vue'
import App from './App.vue'
import { useLayoutStore } from './layout-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
const failure: ApiError = {
  code: 'folder-inspection-failed',
  message: 'Legacy detail',
  diagnostic: {
    reason: 'workspace-folder-inspection-failed',
    path: '/novels/יעל <img>',
    detail: 'EACCES <b>'
  }
}
const choice: FolderChoiceDto = { root: '/novels/new', name: 'New', isProject: false }

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})

describe('native folder diagnostics', () => {
  it.each(['chooseFolder', 'takeLaunchFolder'] as const)(
    'retranslates %s failures without retrying or replacing welcome controls',
    async (operation) => {
      const call = vi
        .spyOn(fake.api.workspace, operation)
        .mockResolvedValue({ ok: false, error: failure })
      const workspace = useWorkspaceStore()
      const page = mount(WelcomeScreen, { attachTo: document.body })
      const button = page.get<HTMLButtonElement>('button.primary').element
      button.focus()
      if (operation === 'chooseFolder') await workspace.chooseFolder()
      else await workspace.openLaunchFolder()
      await flushPromises()
      const english = page.get('[data-testid=folder-error]').text()
      const open = vi.spyOn(fake.api.workspace, 'openProject')
      const writes = [...fake.saves]
      useUiLanguageStore().locale = 'he'
      await flushPromises()
      const hebrew = page.get('[data-testid=folder-error]').text()
      expect(hebrew).not.toBe(english)
      expect(hebrew).toContain('\u2068/novels/יעל <img>\u2069')
      expect(hebrew).toContain('\u2068EACCES <b>\u2069')
      expect(page.find('img, b').exists()).toBe(false)
      expect(document.activeElement).toBe(button)
      expect(page.get('button.primary').element).toBe(button)
      expect(call).toHaveBeenCalledTimes(1)
      expect(open).not.toHaveBeenCalled()
      expect(fake.saves).toEqual(writes)
      expect(workspace.screen).toBe('welcome')
      page.unmount()
    }
  )

  it('preserves the initialization title and focus after folder selection fails', async () => {
    const workspace = useWorkspaceStore()
    await workspace.useFolder(choice)
    const page = mount(InitializePrompt, { attachTo: document.body })
    const input = page.get<HTMLInputElement>('input')
    await input.setValue('טיוטה Title')
    input.element.focus()
    vi.spyOn(fake.api.workspace, 'chooseFolder').mockResolvedValue({ ok: false, error: failure })
    await workspace.chooseFolder()
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(page.get('[data-testid=folder-error]').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(page.get('input').element).toBe(input.element)
    expect(input.element.value).toBe('טיוטה Title')
    expect(document.activeElement).toBe(input.element)
    expect(workspace.chosenFolder).toEqual(choice)
    expect(workspace.screen).toBe('initialize')
    expect(fake.created).toEqual([])
    page.unmount()
  })

  it('does not flush, close, or navigate a conflicted draft for an external-launch failure', async () => {
    const workspace = useWorkspaceStore()
    await workspace.openProject('/book')
    await useManuscriptStore().load()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('טיוטה unsaved')
    editor.saveState = 'conflict'
    const page = mount(ProjectLayout, { shallow: true })
    await flushPromises()
    const project = workspace.project
    const save = vi.spyOn(fake.api.manuscript, 'saveEntryText')
    const open = vi.spyOn(fake.api.workspace, 'openProject')
    await workspace.useFolderResult({ ok: false, error: failure })
    useUiLanguageStore().locale = 'he'
    await flushPromises()
    expect(page.get('[data-testid=folder-error]').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(workspace.project).toBe(project)
    expect(editor.text).toBe('טיוטה unsaved')
    expect(editor.saveState).toBe('conflict')
    expect(fake.closedProjects).toBe(0)
    expect(save).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    useLayoutStore().focusMode = true
    await flushPromises()
    expect(page.get('[data-testid=folder-error]').text()).toMatch(/[\u0590-\u05ff]/u)
    page.unmount()
  })

  it.each(['chooseFolder', 'takeLaunchFolder'] as const)(
    'ignores obsolete pending %s after a newer folder event failed',
    async (operation) => {
      const workspace = useWorkspaceStore()
      let finish: ((result: ApiResult<FolderChoiceDto | null>) => void) | undefined
      vi.spyOn(fake.api.workspace, operation).mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      const pending =
        operation === 'chooseFolder' ? workspace.chooseFolder() : workspace.openLaunchFolder()
      await workspace.useFolderResult({ ok: false, error: failure })
      if (finish === undefined) throw new Error('Missing dialog')
      finish({ ok: true, value: choice })
      await pending
      expect(workspace.screen).toBe('welcome')
      expect(workspace.chosenFolder).toBeNull()
      expect(workspace.folderErrorMessage).not.toBeNull()
    }
  )

  it('ignores a delayed folder failure after a newer successful choice', async () => {
    const workspace = useWorkspaceStore()
    let finish: ((result: ApiResult<FolderChoiceDto | null>) => void) | undefined
    vi.spyOn(fake.api.workspace, 'takeLaunchFolder').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = workspace.openLaunchFolder()
    await workspace.useFolderResult({ ok: true, value: choice })
    if (finish === undefined) throw new Error('Missing launch inspection')
    finish({ ok: false, error: failure })
    await pending
    expect(workspace.folderErrorMessage).toBeNull()
    expect(workspace.chosenFolder).toEqual(choice)
    expect(workspace.screen).toBe('initialize')
  })

  it('keeps the last recent list when availability inspection fails, without retries on language change', async () => {
    const workspace = useWorkspaceStore()
    const list = vi
      .spyOn(fake.api.workspace, 'listRecentProjects')
      .mockResolvedValueOnce({
        ok: true,
        value: [{ root: choice.root, title: choice.name, available: true, lastOpenedAt: '' }]
      })
      .mockResolvedValue({ ok: false, error: failure })
    await workspace.loadRecents()
    const previous = workspace.recents
    await workspace.loadRecents()
    const english = workspace.recentsLoadErrorMessage
    useUiLanguageStore().locale = 'he'
    expect(workspace.recentsLoadErrorMessage).not.toBe(english)
    expect(workspace.recentsLoadErrorMessage).toContain('\u2068/novels/יעל <img>\u2069')
    expect(workspace.recents).toBe(previous)
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('keeps cancellation silent and clears only folder errors after a successful inspection', async () => {
    const workspace = useWorkspaceStore()
    await workspace.useFolderResult({ ok: false, error: failure })
    workspace.errorMessage = 'Other action'
    await workspace.chooseFolder()
    expect(workspace.folderErrorMessage).not.toBeNull()
    expect(workspace.errorMessage).toBe('Other action')
    await workspace.useFolderResult({ ok: true, value: choice })
    expect(workspace.folderErrorMessage).toBeNull()
    expect(workspace.errorMessage).toBe('Other action')
    expect(workspace.screen).toBe('initialize')
  })

  it('routes later-launch failure events through the mounted app and unsubscribes on unmount', async () => {
    const page = mount(App)
    await flushPromises()
    fake.emitFolderResult({ ok: false, error: failure })
    await flushPromises()
    expect(page.get('[data-testid=folder-error]').text()).not.toContain('Legacy detail')
    page.unmount()
    const workspace = useWorkspaceStore()
    const previous = workspace.folderErrorMessage
    fake.openFolder(choice)
    await flushPromises()
    expect(workspace.folderErrorMessage).toBe(previous)
    expect(workspace.screen).toBe('welcome')
  })
})
