import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { RecentProjectDto } from '../../../contract/dtos'
import { createFakePlotDeviceApi } from './fake-plot-device-api'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(() => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})

describe('workspace store', () => {
  it('opens a chosen project folder directly', async () => {
    fake.api.workspace.chooseFolder = () =>
      Promise.resolve({ root: '/novels/salt-orchard', name: 'salt-orchard', isProject: true })
    const store = useWorkspaceStore()

    await store.chooseFolder()

    expect(store.screen).toBe('project')
    expect(store.project?.title).toBe('The Salt Orchard')
  })

  it('asks before initializing a folder that is not a project', async () => {
    fake.api.workspace.chooseFolder = () =>
      Promise.resolve({ root: '/novels/new', name: 'new', isProject: false })
    const store = useWorkspaceStore()

    await store.chooseFolder()
    expect(store.screen).toBe('initialize')

    await store.initializeChosenFolder('A New Book')
    expect(store.screen).toBe('project')
    expect(store.project?.title).toBe('A New Book')
  })

  it('stays put when the dialog is cancelled', async () => {
    const store = useWorkspaceStore()
    await store.chooseFolder()
    expect(store.screen).toBe('welcome')
  })

  it('explains a failure and refreshes the recents list', async () => {
    const recents: RecentProjectDto[] = [
      { root: '/gone', title: 'Gone', lastOpenedAt: '', available: false }
    ]
    fake.api.workspace.listRecentProjects = () => Promise.resolve(recents)
    fake.api.workspace.openProject = () =>
      Promise.resolve({ ok: false, error: { code: 'folder-missing', message: 'x' } })
    const store = useWorkspaceStore()

    await store.openProject('/gone')

    expect(store.screen).toBe('welcome')
    expect(store.errorMessage).toContain('no longer exists')
    expect(store.recents).toHaveLength(1)
  })

  it('saves the open chapter and tells the main process when closing a project', async () => {
    const store = useWorkspaceStore()
    await store.openProject('/novels/salt-orchard')
    await useManuscriptStore().load()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('Typed just before closing.\n')

    await store.backToWelcome()

    expect(fake.files.get('The Ferry.md')).toBe('Typed just before closing.\n')
    expect(fake.closedProjects).toBe(1)
    expect(store.screen).toBe('welcome')
  })

  it('refuses to close while unsaved text is stuck in a conflict', async () => {
    const store = useWorkspaceStore()
    await store.openProject('/novels/salt-orchard')
    await useManuscriptStore().load()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    fake.files.set('The Ferry.md', 'Edited in Obsidian.\n')
    editor.edit('Mine.\n')
    await editor.flush()

    await store.backToWelcome()

    expect(store.screen).toBe('project')
    expect(store.errorMessage).toContain('unsaved')
    expect(fake.closedProjects).toBe(0)
  })
})

describe('workspace store: folders from outside the app', () => {
  it('opens the project the app was started with, once', async () => {
    fake.launch.folder = { root: '/novels/salt-orchard', name: 'salt-orchard', isProject: true }
    const store = useWorkspaceStore()
    await store.openLaunchFolder()
    expect(store.screen).toBe('project')
    expect(fake.launch.folder).toBeNull()
  })

  it('offers a plain folder as a new project', async () => {
    fake.launch.folder = { root: '/novels/new', name: 'new', isProject: false }
    const store = useWorkspaceStore()
    await store.openLaunchFolder()
    expect(store.screen).toBe('initialize')
    expect(store.chosenFolder?.root).toBe('/novels/new')
  })

  it('saves the open chapter before switching to a folder from a later launch', async () => {
    const store = useWorkspaceStore()
    await store.openProject('/novels/salt-orchard')
    await useManuscriptStore().load()
    const editor = useEditorStore()
    await editor.open('The Ferry.md')
    editor.edit('Typed before the second launch.\n')

    await store.useFolder({ root: '/novels/new', name: 'new', isProject: false })

    expect(fake.files.get('The Ferry.md')).toBe('Typed before the second launch.\n')
    expect(fake.closedProjects).toBe(1)
    expect(store.screen).toBe('initialize')
  })
})
