import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ApiError,
  FolderChoiceDto,
  ProjectSummaryDto,
  RecentProjectDto
} from '../../../contract/dtos'
import { plotDeviceApi } from './plot-device-api'

/** Which top-level screen the window shows. */
export type WorkspaceScreen = 'welcome' | 'initialize' | 'project'

/** The open project, the recents list, and the steps between them. */
export const useWorkspaceStore = defineStore('workspace', () => {
  const screen = ref<WorkspaceScreen>('welcome')
  const recents = ref<readonly RecentProjectDto[]>([])
  const chosenFolder = ref<FolderChoiceDto | null>(null)
  const project = ref<ProjectSummaryDto | null>(null)
  const errorMessage = ref<string | null>(null)
  const busy = ref(false)

  const api = (): ReturnType<typeof plotDeviceApi.current>['workspace'] =>
    plotDeviceApi.current().workspace

  async function run(task: () => Promise<void>): Promise<void> {
    busy.value = true
    errorMessage.value = null
    try {
      await task()
    } finally {
      busy.value = false
    }
  }

  async function loadRecents(): Promise<void> {
    recents.value = await api().listRecentProjects()
  }

  async function openProject(root: string): Promise<void> {
    await run(async () => {
      const result = await api().openProject(root)
      if (result.ok) {
        project.value = result.value
        chosenFolder.value = null
        screen.value = 'project'
      } else {
        errorMessage.value = describeError(result.error)
      }
      await loadRecents()
    })
  }

  async function chooseFolder(): Promise<void> {
    errorMessage.value = null
    const choice = await api().chooseFolder()
    if (choice === null) return
    if (choice.isProject) {
      await openProject(choice.root)
      return
    }
    chosenFolder.value = choice
    screen.value = 'initialize'
  }

  async function initializeChosenFolder(title: string): Promise<void> {
    const folder = chosenFolder.value
    if (folder === null) return
    await run(async () => {
      const result = await api().initializeProject(folder.root, title)
      if (result.ok) {
        project.value = result.value
        chosenFolder.value = null
        screen.value = 'project'
        await loadRecents()
      } else {
        errorMessage.value = describeError(result.error)
      }
    })
  }

  async function removeRecent(root: string): Promise<void> {
    await api().removeRecentProject(root)
    await loadRecents()
  }

  async function backToWelcome(): Promise<void> {
    screen.value = 'welcome'
    chosenFolder.value = null
    project.value = null
    errorMessage.value = null
    await loadRecents()
  }

  return {
    screen,
    recents,
    chosenFolder,
    project,
    errorMessage,
    busy,
    loadRecents,
    openProject,
    chooseFolder,
    initializeChosenFolder,
    removeRecent,
    backToWelcome
  }
})

function describeError(error: ApiError): string {
  switch (error.code) {
    case 'folder-missing':
      return 'That folder no longer exists. It may have been moved or renamed.'
    case 'not-a-project':
      return error.projectAbove !== undefined
        ? `That folder is inside another project (${error.projectAbove}). Open that one instead.`
        : 'That folder has no novel.md, so it is not a Plot Device project.'
    default:
      return error.message
  }
}
