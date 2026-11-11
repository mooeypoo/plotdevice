import type {
  ContentsChangeRequest,
  ExportRequest,
  FolderRenamesRequest,
  KindsChangeRequest,
  NewProjectRequest,
  OpenedProject,
  OpenProjectRequest,
  ProjectChangeResult,
  ProjectView,
  RecentProjectView,
  SaveStatusView,
} from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { beforeLeavingBook } from '../closing'
import { useApi } from '../api'

/** Something to tell the author: a message key and its parameters. */
export interface Notice {
  key: string
  params: string[]
  /** A button beside the message, such as "Tidy tags…". */
  action?: { key: string; run: () => void }
}

/** The open project, the recent list and save statuses, shared by every screen. */
export const useProjectStore = defineStore('project', () => {
  const api = useApi()
  const opened = ref<OpenedProject | null>(null)
  const recent = ref<RecentProjectView[]>([])
  const statuses = ref<Partial<Record<ProjectPath, SaveStatusView>>>({})
  const notice = ref<Notice | null>(null)
  const project = computed(() => opened.value?.project ?? null)
  /** The last folder renames, which "Undo folder renames" puts back until the book closes. */
  const renamedFolders = ref<FolderRenamesRequest | null>(null)

  const tell = (key: string, ...params: string[]): void => {
    notice.value = { key, params }
  }

  /** A notice with something to do about it. */
  const offer = (key: string, params: string[], action: NonNullable<Notice['action']>): void => {
    notice.value = { key, params, action }
  }

  /** Before another book replaces this one: each step in turn, such as offering backups. */
  async function leaving(): Promise<void> {
    if (project.value) for (const step of beforeLeavingBook) await step()
  }

  function setProject(view: ProjectView): void {
    if (opened.value) opened.value = { ...opened.value, project: view }
  }

  async function refreshRecent(): Promise<void> {
    recent.value = await api.getRecentProjects()
  }

  async function open(request: OpenProjectRequest): Promise<void> {
    await leaving()
    const result = await api.openProject(request)
    if (result.ok) {
      statuses.value = {}
      opened.value = result.value
      notice.value = null
      renamedFolders.value = null
    } else if (result.error !== 'cancelled') tell(`open-failed-${result.error}`)
    await refreshRecent()
  }

  /** The sample book to try, in the interface's language (Milestone 20). */
  async function openSample(language: 'en' | 'he'): Promise<void> {
    await leaving()
    const result = await api.openSample(language)
    if (result.ok) {
      statuses.value = {}
      opened.value = result.value
      notice.value = null
      renamedFolders.value = null
    } else tell(`open-failed-${result.error === 'cancelled' || result.error === 'not-recent' ? 'unreadable' : result.error}`)
    await refreshRecent()
  }

  /** "Start the sample over", once the author has confirmed. */
  async function restartSample(): Promise<void> {
    const result = await api.restartSample()
    if (!result.ok) return tell('sample-restart-failed')
    statuses.value = {}
    opened.value = result.value
    renamedFolders.value = null
    tell('sample-restarted')
  }

  async function create(details: NewProjectRequest): Promise<boolean> {
    await leaving()
    const result = await api.createProject(details)
    if (result.ok) {
      statuses.value = {}
      opened.value = result.value
      notice.value = null
      renamedFolders.value = null
      await refreshRecent()
      return true
    }
    if (result.error === 'folder-exists' || result.error === 'inside-project') tell(`create-failed-${result.error}`)
    else if (result.error !== 'cancelled') tell('create-failed')
    return false
  }

  async function forget(root: string): Promise<void> {
    recent.value = await api.forgetRecentProject(root)
  }

  /** Applies a change to the project; on failure tells the author why, and reloads if another app changed the contents. */
  async function change(request: () => Promise<ProjectChangeResult>): Promise<boolean> {
    const result = await request()
    if (result.ok) {
      setProject(result.value)
      return true
    }
    if (result.error === 'stale' && project.value) {
      await open({ recent: project.value.root })
      tell('change-failed-stale')
    } else if (result.error === 'name-taken' || result.error === 'invalid-name') tell(`change-failed-${result.error}`)
    else tell('change-failed')
    return false
  }

  const changeContents = (request: ContentsChangeRequest) => change(() => api.changeContents(request))
  /** Makes an outline the book's main outline, whose sections name the timeline's columns (ADR 0012). */
  const setMainOutline = (file: ProjectPath) => change(() => api.setMainOutline(file))

  /**
   * Exports the book from the Export window (Milestone 22): the title and author typed there are saved
   * to the book first. Says where the file went, with "Show in folder", and what couldn't be read.
   * Whether the window can close: `false` when the author cancelled the save dialog or something failed.
   */
  async function exportBook(request: ExportRequest): Promise<boolean> {
    const result = await api.exportBook(request)
    if (!result.ok) {
      if (result.error !== 'cancelled') tell(`export-failed-${result.error}`)
      return false
    }
    const { path, missing, project: updated } = result.value
    if (updated) setProject(updated)
    const show = { key: 'export-show', run: () => void api.showExportedFile(path) }
    if (missing.length === 0) offer('exported', [path], show)
    else offer('exported-missing', [path, missing.map((chapter) => chapter.title).join(', ')], show)
    return true
  }
  const renameChapter = (file: ProjectPath, title: string) => change(() => api.renameChapter(file, title))
  /** A chapter becomes a poem or prose again (ADR 0013): only its `form` line changes. */
  const setChapterForm = (file: ProjectPath, form: 'prose' | 'poem') => change(() => api.setChapterForm(file, form))
  /** Whether new chapters start as poems, from the book menu. */
  const setNewChapterForm = (form: 'prose' | 'poem') => change(() => api.setNewChapterForm(form))
  /** The book's kinds of pages, and what it calls a chapter (ADR 0011). */
  const changeKinds = (request: KindsChangeRequest) => change(() => api.changeKinds(request))
  /** Renames the kinds' folders and every link to them: how many links changed, or `null` when it couldn't. */
  async function renameFolders(renames: FolderRenamesRequest): Promise<number | null> {
    const result = await api.renameFolders(renames)
    if (!result.ok) {
      tell('folders-failed')
      return null
    }
    setProject(result.value.project)
    renamedFolders.value = renames
    return result.value.linksUpdated
  }

  /** Puts the last folder renames back; the folders it moved back, or `null` when it couldn't. */
  async function undoFolderRenames(): Promise<FolderRenamesRequest | null> {
    const renames = renamedFolders.value
    const result = await api.undoFolderRenames()
    renamedFolders.value = null
    if (!result.ok || !renames) {
      tell(result.ok || result.error !== 'stale' ? 'folders-failed' : 'folders-undo-stale')
      return null
    }
    setProject(result.value)
    tell('folders-undone')
    return renames.map(({ from, to }) => ({ from: to, to: from }))
  }

  const renameChapterFile = (file: ProjectPath, newName: string) => change(() => api.renameChapterFile(file, newName))

  api.onEvent((event) => {
    if (event.kind === 'project-opened') {
      statuses.value = {}
      opened.value = event.opened
      notice.value = null
      renamedFolders.value = null
      void refreshRecent()
    } else if (event.kind === 'open-failed') tell(`open-failed-${event.error}`)
    else if (event.kind === 'project-changed') setProject(event.project)
    else if (event.kind === 'save-status') statuses.value = { ...statuses.value, [event.file]: event.status }
  })
  void api.getOpenProject().then((current) => {
    if (current && !opened.value) opened.value = current
  })
  void refreshRecent()

  return {
    opened,
    project,
    recent,
    statuses,
    notice,
    tell,
    offer,
    setProject,
    open,
    openSample,
    restartSample,
    create,
    forget,
    change,
    changeContents,
    setMainOutline,
    changeKinds,
    renamedFolders,
    renameFolders,
    undoFolderRenames,
    renameChapter,
    setChapterForm,
    setNewChapterForm,
    renameChapterFile,
    exportBook,
  }
})
