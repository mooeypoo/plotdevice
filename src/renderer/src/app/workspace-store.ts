import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ApiError,
  FolderChoiceDto,
  ProjectSummaryDto,
  RecentProjectDto
} from '../../../contract/dtos'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
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

  function showProject(summary: ProjectSummaryDto): void {
    project.value = summary
    chosenFolder.value = null
    screen.value = 'project'
  }

  const openRoot = (): string | undefined => project.value?.root

  /** Re-reads the open project's warnings and file problems after files changed outside. */
  async function refresh(): Promise<void> {
    const root = project.value?.root
    if (root === undefined) return
    const result = await api().refreshProject()
    // The project may have been closed or replaced while it was being re-read.
    if (result.ok && openRoot() === root) project.value = result.value
  }

  async function openProject(root: string): Promise<void> {
    if (!(await leaveCurrentProject())) return
    await run(async () => {
      const result = await api().openProject(root)
      if (result.ok) showProject(result.value)
      else errorMessage.value = describeError(result.error)
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
        showProject(result.value)
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

  /**
   * Saves and closes the open project, if any. Returns false (and stays put) when unsaved text
   * can't be saved, so nothing the writer typed is dropped.
   */
  async function leaveCurrentProject(): Promise<boolean> {
    if (project.value === null) return true
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) {
      errorMessage.value = 'Resolve the unsaved changes in the open chapter first.'
      return false
    }
    await editor.close()
    useManuscriptStore().close()
    useCodexStore().close()
    await api().closeProject()
    project.value = null
    return true
  }

  async function backToWelcome(): Promise<void> {
    if (!(await leaveCurrentProject())) return
    screen.value = 'welcome'
    chosenFolder.value = null
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
    refresh,
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
