// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiResult, ProjectSummaryDto } from '../../../contract/dtos'
import InitializePrompt from '../features/welcome/InitializePrompt.vue'
import WelcomeScreen from '../features/welcome/WelcomeScreen.vue'
import ProjectLayout from './ProjectLayout.vue'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useUiLanguageStore().initialize()
})
afterEach(() => vi.restoreAllMocks())

describe('workspace cached diagnostics', () => {
  it('retranslates an open failure without reopening or reloading recents', async () => {
    const open = vi.spyOn(fake.api.workspace, 'openProject').mockResolvedValue({
      ok: false,
      error: {
        code: 'folder-missing',
        message: 'Legacy',
        diagnostic: { reason: 'workspace-folder-missing', path: '/novels/יעל <img src=x>' }
      }
    })
    const recents = vi.spyOn(fake.api.workspace, 'listRecentProjects')
    const workspace = useWorkspaceStore()
    await workspace.openProject('/novels/יעל <img src=x>')
    const page = mount(WelcomeScreen)
    expect(page.get('[role="alert"]').text()).toContain('no longer exists')
    await useUiLanguageStore().change('he')
    expect(page.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(page.get('[role="alert"]').text()).not.toContain('no longer exists')
    expect(page.get('[role="alert"]').text()).toContain('/novels/יעל <img src=x>')
    expect(page.find('img').exists()).toBe(false)
    expect(open).toHaveBeenCalledOnce()
    expect(recents).toHaveBeenCalledOnce()
    page.unmount()
  })

  it('preserves initialization input and focus while translating a failed creation', async () => {
    const initialize = vi.spyOn(fake.api.workspace, 'initializeProject').mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'write-failed',
        message: 'Legacy',
        diagnostic: { reason: 'file-create-failed', path: '/יעל/novel.md', detail: 'EACCES <b>' }
      }
    })
    const workspace = useWorkspaceStore()
    await workspace.useFolder({ root: '/יעל', name: 'יעל', isProject: false })
    const page = mount(InitializePrompt, { attachTo: document.body })
    const input = page.get<HTMLInputElement>('input')
    await input.setValue('My book טיוטה')
    input.element.focus()
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(page.get('[role="alert"]').text()).toContain("Couldn't create")
    await useUiLanguageStore().change('he')
    expect(page.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(page.get('[role="alert"]').text()).not.toContain("Couldn't create")
    expect(page.get('[role="alert"]').text()).toContain('EACCES <b>')
    expect(page.find('b').exists()).toBe(false)
    expect(page.get('input').element).toBe(input.element)
    expect(input.element.value).toBe('My book טיוטה')
    expect(document.activeElement).toBe(input.element)
    expect(initialize).toHaveBeenCalledExactlyOnceWith('/יעל', 'My book טיוטה', 'en')
    expect(workspace.screen).toBe('initialize')
    await workspace.initializeChosenFolder(input.element.value, 'en')
    expect(workspace.errorMessage).toBeNull()
    expect(workspace.screen).toBe('project')
    page.unmount()
  })

  it('shows refresh failures in the project and clears them after a successful refresh', async () => {
    const workspace = useWorkspaceStore()
    await workspace.openProject('/novels/salt-orchard')
    const refresh = vi.spyOn(fake.api.workspace, 'refreshProject').mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'folder-missing',
        message: 'Legacy',
        diagnostic: { reason: 'workspace-folder-missing', path: '/novels/salt-orchard' }
      }
    })
    const page = mount(ProjectLayout, {
      shallow: true,
      // The shell's body is stubbed; its slot holds the notices under test.
      global: { stubs: { TopBar: true, EditorPane: true }, renderStubDefaultSlot: true }
    })
    await flushPromises()
    await workspace.refresh()
    expect(page.get('[role="alert"]').text()).toContain('no longer exists')
    await useUiLanguageStore().change('he')
    expect(page.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
    expect(refresh).toHaveBeenCalledOnce()
    expect(workspace.project).not.toBeNull()
    await workspace.refresh()
    expect(page.find('[role="alert"]').exists()).toBe(false)
    page.unmount()
  })

  it('ignores an old refresh failure after closing the project', async () => {
    const workspace = useWorkspaceStore()
    await workspace.openProject('/novels/salt-orchard')
    let finish: ((result: ApiResult<ProjectSummaryDto>) => void) | undefined
    vi.spyOn(fake.api.workspace, 'refreshProject').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = workspace.refresh()
    await workspace.backToWelcome()
    if (finish === undefined) throw new Error('Expected pending refresh')
    finish({ ok: false, error: { code: 'folder-missing', message: 'Old failure' } })
    await pending
    expect(workspace.errorMessage).toBeNull()
    expect(workspace.refreshErrorMessage).toBeNull()
  })

  it('retranslates the draft-safety blocker without closing or changing either draft', async () => {
    const workspace = useWorkspaceStore()
    await workspace.openProject('/novels/salt-orchard')
    await useManuscriptStore().load()
    const page = mount(ProjectLayout, { shallow: true, global: { renderStubDefaultSlot: true } })
    await flushPromises()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    fake.files.set('The Ferry.md', 'Outside.\n')
    editor.edit('Mine טיוטה.\n')
    await editor.flush()
    await workspace.backToWelcome()
    expect(workspace.errorMessage).toContain('unsaved')
    expect(page.get('[role="alert"]').text()).toContain('unsaved')
    const before = new Map(fake.files)
    const saves = [...fake.saves]
    await useUiLanguageStore().change('he')
    expect(workspace.errorMessage).toMatch(/[\u0590-\u05ff]/u)
    await workspace.refresh()
    expect(workspace.errorMessage).toMatch(/[\u0590-\u05ff]/u)
    expect(editor.text).toBe('Mine טיוטה.\n')
    expect(fake.files).toEqual(before)
    expect(fake.saves).toEqual(saves)
    expect(fake.closedProjects).toBe(0)
    expect(workspace.screen).toBe('project')
    expect(page.get('[role="alert"]').text()).toMatch(/[\u0590-\u05ff]/u)
    page.unmount()
  })

  it('keeps the latest refresh refusal when an older request finishes later', async () => {
    const workspace = useWorkspaceStore()
    await workspace.openProject('/novels/salt-orchard')
    let finish: ((result: ApiResult<ProjectSummaryDto>) => void) | undefined
    vi.spyOn(fake.api.workspace, 'refreshProject')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'read-failed', message: 'Latest failure' }
      })
    const pending = workspace.refresh()
    await workspace.refresh()
    if (finish === undefined) throw new Error('Expected pending refresh')
    finish({ ok: false, error: { code: 'read-failed', message: 'Old failure' } })
    await pending
    expect(workspace.refreshErrorMessage).toBe('Latest failure')
  })

  it('ignores an old refresh failure after reopening the same root', async () => {
    const workspace = useWorkspaceStore()
    const summary = { ...fake.summary.current }
    await workspace.openProject(summary.root)
    let finish: ((result: ApiResult<ProjectSummaryDto>) => void) | undefined
    vi.spyOn(fake.api.workspace, 'refreshProject').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = workspace.refresh()
    await workspace.openProject(summary.root)
    if (finish === undefined) throw new Error('Expected pending refresh')
    finish({ ok: false, error: { code: 'read-failed', message: 'Old failure' } })
    await pending
    expect(workspace.refreshErrorMessage).toBeNull()
    expect(workspace.project?.root).toBe(summary.root)
  })
})
