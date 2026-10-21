import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FolderChoiceDto, ProjectSummaryDto, RecentProjectDto } from '../../../contract/dtos'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'
import { useErrorNotice } from '../shared/use-error-notice'

/** Which top-level screen the window shows. */
export type WorkspaceScreen = 'welcome' | 'initialize' | 'project'

/** The open project, the recents list, and the steps between them. */
export const useWorkspaceStore = defineStore('workspace', () => {
  const screen = ref<WorkspaceScreen>('welcome')
  const recents = ref<readonly RecentProjectDto[]>([])
  const chosenFolder = ref<FolderChoiceDto | null>(null)
  const project = ref<ProjectSummaryDto | null>(null)
  const { message: errorMessage, source: errorSource } = useErrorNotice()
  const { message: refreshErrorMessage, source: refreshErrorSource } = useErrorNotice()
  const busy = ref(false)
  let refreshRequest = 0

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
    refreshRequest += 1
    refreshErrorSource.value = null
    project.value = summary
    chosenFolder.value = null
    screen.value = 'project'
  }

  /** Re-reads the open project's warnings and file problems after files changed outside. */
  async function refresh(): Promise<void> {
    const currentProject = project.value
    if (currentProject === null) return
    const request = ++refreshRequest
    const result = await api().refreshProject()
    // Ignore replaced projects and responses superseded by a newer refresh.
    if (request !== refreshRequest || project.value !== currentProject) return
    if (result.ok) {
      project.value = result.value
      refreshErrorSource.value = null
    } else refreshErrorSource.value = result.error
  }

  async function openProject(root: string): Promise<void> {
    if (!(await leaveCurrentProject())) return
    await run(async () => {
      const result = await api().openProject(root)
      if (result.ok) showProject(result.value)
      else errorSource.value = result.error
      await loadRecents()
    })
  }

  async function chooseFolder(): Promise<void> {
    errorMessage.value = null
    const choice = await api().chooseFolder()
    if (choice !== null) await useFolder(choice)
  }

  /**
   * Opens a chosen folder: a project opens, any other folder is offered as a new project. Used by
   * the dialog and by folders given from outside (the command line, a file manager).
   */
  async function useFolder(choice: FolderChoiceDto): Promise<void> {
    if (choice.isProject) {
      await openProject(choice.root)
      return
    }
    if (!(await leaveCurrentProject())) return
    chosenFolder.value = choice
    screen.value = 'initialize'
  }

  /** Opens the folder the app was started with, if any. */
  async function openLaunchFolder(): Promise<void> {
    const choice = await api().takeLaunchFolder()
    if (choice !== null) await useFolder(choice)
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
        errorSource.value = result.error
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
    await editor.waitForNavigation()
    await editor.flush()
    if (editor.hasStuckChanges) {
      errorSource.value = { notice: 'workspace-unsaved-changes' }
      return false
    }
    await editor.close()
    useReferenceStore().clear()
    useManuscriptStore().close()
    useCodexStore().close()
    await api().closeProject()
    refreshRequest += 1
    project.value = null
    refreshErrorSource.value = null
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
    refreshErrorMessage,
    busy,
    loadRecents,
    openProject,
    refresh,
    chooseFolder,
    useFolder,
    openLaunchFolder,
    initializeChosenFolder,
    removeRecent,
    backToWelcome
  }
})
