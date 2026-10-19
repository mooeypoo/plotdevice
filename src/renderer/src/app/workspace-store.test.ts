import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PlotDeviceApi, WorkspaceApi } from '../../../contract/api'
import type { ProjectSummaryDto, RecentProjectDto } from '../../../contract/dtos'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'

const summary: ProjectSummaryDto = {
  root: '/novels/preservers',
  title: 'The Preservers',
  formatVersion: 1,
  readOnly: false,
  warnings: [],
  counts: { part: 3, chapter: 14, character: 5, location: 1, note: 6, scene: 1, untyped: 5 },
  problems: []
}

let workspaceApi: WorkspaceApi
let recents: RecentProjectDto[]

beforeEach(() => {
  setActivePinia(createPinia())
  recents = []
  workspaceApi = {
    chooseFolder: () => Promise.resolve(null),
    openProject: () => Promise.resolve({ ok: true, value: summary }),
    initializeProject: (_, title) => Promise.resolve({ ok: true, value: { ...summary, title } }),
    listRecentProjects: () => Promise.resolve(recents),
    removeRecentProject: (root) => {
      recents = recents.filter((entry) => entry.root !== root)
      return Promise.resolve()
    }
  }
  const api: PlotDeviceApi = { contractVersion: 2, workspace: workspaceApi }
  plotDeviceApi.current = () => api
})

describe('workspace store', () => {
  it('opens a chosen project folder directly', async () => {
    workspaceApi.chooseFolder = () =>
      Promise.resolve({ root: '/novels/preservers', name: 'preservers', isProject: true })
    const store = useWorkspaceStore()

    await store.chooseFolder()

    expect(store.screen).toBe('project')
    expect(store.project?.title).toBe('The Preservers')
  })

  it('asks before initializing a folder that is not a project', async () => {
    workspaceApi.chooseFolder = () =>
      Promise.resolve({ root: '/novels/new', name: 'new', isProject: false })
    const store = useWorkspaceStore()

    await store.chooseFolder()
    expect(store.screen).toBe('initialize')
    expect(store.chosenFolder?.name).toBe('new')

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
    recents = [{ root: '/gone', title: 'Gone', lastOpenedAt: '', available: false }]
    workspaceApi.openProject = () =>
      Promise.resolve({ ok: false, error: { code: 'folder-missing', message: 'x' } })
    const store = useWorkspaceStore()

    await store.openProject('/gone')

    expect(store.screen).toBe('welcome')
    expect(store.errorMessage).toContain('no longer exists')
    expect(store.recents).toHaveLength(1)
  })

  it('shows why initializing was refused and stays on the prompt', async () => {
    workspaceApi.chooseFolder = () =>
      Promise.resolve({ root: '/novels', name: 'novels', isProject: false })
    workspaceApi.initializeProject = () =>
      Promise.resolve({
        ok: false,
        error: { code: 'contains-project', message: 'This folder contains another project.' }
      })
    const store = useWorkspaceStore()

    await store.chooseFolder()
    await store.initializeChosenFolder('All')

    expect(store.screen).toBe('initialize')
    expect(store.errorMessage).toBe('This folder contains another project.')
  })

  it('removes a recent project', async () => {
    recents = [{ root: '/a', title: 'A', lastOpenedAt: '', available: true }]
    const store = useWorkspaceStore()
    await store.loadRecents()

    await store.removeRecent('/a')

    expect(store.recents).toEqual([])
  })

  it('goes back to the welcome screen', async () => {
    workspaceApi.chooseFolder = () =>
      Promise.resolve({ root: '/novels/preservers', name: 'preservers', isProject: true })
    const store = useWorkspaceStore()
    await store.chooseFolder()

    await store.backToWelcome()

    expect(store.screen).toBe('welcome')
    expect(store.project).toBeNull()
  })
})
