import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type {
  ApiResult,
  FolderChoiceDto,
  ProjectSummaryDto,
  RecentProjectDto
} from '../../../contract/dtos'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'
import { useWorkbenchStore } from './workbench-store'
import { useErrorNotice } from '../shared/use-error-notice'

/** Which top-level screen the window shows. */
export type WorkspaceScreen = 'welcome' | 'initialize' | 'project'

/** The open project, the recents list, and the steps between them. */
export const useWorkspaceStore = defineStore('workspace', () => {
  const screen = ref<WorkspaceScreen>('welcome')
  const recents = ref<readonly RecentProjectDto[]>([])
  const chosenFolder = ref<FolderChoiceDto | null>(null)
  const project = ref<ProjectSummaryDto | null>(null)
  // The workbench keeps its per-project bindings for whichever project is open.
  watch(
    () => project.value?.root ?? null,
    (root) => {
      useWorkbenchStore().projectRoot = root
    },
    { flush: 'sync', immediate: true }
  )
  const { message: errorMessage, source: errorSource } = useErrorNotice()
  const { message: refreshErrorMessage, source: refreshErrorSource } = useErrorNotice()
  const { message: recentsLoadErrorMessage, source: recentsLoadErrorSource } = useErrorNotice()
  const { message: recentsRemoveErrorMessage, source: recentsRemoveErrorSource } = useErrorNotice()
  const { message: rememberErrorMessage, source: rememberErrorSource } = useErrorNotice()
  const { message: folderErrorMessage, source: folderErrorSource } = useErrorNotice()
  const busy = ref(false)
  let refreshRequest = 0
  let recentsRequest = 0
  let removeRequest = 0
  let folderRequest = 0

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
    const request = ++recentsRequest
    const result = await api().listRecentProjects()
    if (request !== recentsRequest) return
    if (result.ok) {
      recents.value = result.value
      recentsLoadErrorSource.value = null
    } else recentsLoadErrorSource.value = result.error
  }

  function showProject(summary: ProjectSummaryDto): void {
    refreshRequest += 1
    refreshErrorSource.value = null
    rememberErrorSource.value =
      summary.recentProjectsError === undefined
        ? null
        : { notice: 'recents-remember-failed', error: summary.recentProjectsError }
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
    folderRequest += 1
    if (!(await leaveCurrentProject())) return
    await run(async () => {
      const result = await api().openProject(root)
      if (result.ok) showProject(result.value)
      else errorSource.value = result.error
      await loadRecents()
    })
  }

  async function chooseFolder(): Promise<void> {
    const request = ++folderRequest
    const result = await api().chooseFolder()
    if (request !== folderRequest) return
    await useFolderResult(result)
  }

  async function useFolderResult(result: ApiResult<FolderChoiceDto | null>): Promise<void> {
    folderRequest += 1
    if (!result.ok) {
      folderErrorSource.value = result.error
      return
    }
    if (result.value === null) return
    folderErrorSource.value = null
    await useFolder(result.value)
  }

  /**
   * Opens a chosen folder: a project opens, any other folder is offered as a new project. Used by
   * the dialog and by folders given from outside (the command line, a file manager).
   */
  async function useFolder(choice: FolderChoiceDto): Promise<void> {
    folderRequest += 1
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
    const request = ++folderRequest
    const result = await api().takeLaunchFolder()
    if (request !== folderRequest) return
    await useFolderResult(result)
  }

  async function initializeChosenFolder(title: string): Promise<void> {
    folderRequest += 1
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
    const request = ++removeRequest
    // A list fetched before this mutation must not later restore an obsolete entry.
    recentsRequest += 1
    const result = await api().removeRecentProject(root)
    if (request !== removeRequest) return
    if (!result.ok) {
      recentsRemoveErrorSource.value = result.error
      return
    }
    recentsRemoveErrorSource.value = null
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
    rememberErrorSource.value = null
    return true
  }

  async function backToWelcome(): Promise<void> {
    folderRequest += 1
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
    recentsLoadErrorMessage,
    recentsRemoveErrorMessage,
    rememberErrorMessage,
    folderErrorMessage,
    busy,
    loadRecents,
    openProject,
    refresh,
    chooseFolder,
    useFolder,
    useFolderResult,
    openLaunchFolder,
    initializeChosenFolder,
    removeRecent,
    backToWelcome
  }
})

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useWorkspaceStore, import.meta.hot))
