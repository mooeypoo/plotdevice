import type {
  ContentsChangeRequest,
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

  /** Compiles the book where the author chooses, and says where it went and what was missing. */
  async function compile(): Promise<void> {
    const compiled = await api.compileBook()
    if (compiled.ok) {
      const { path, missing } = compiled.value
      if (missing.length === 0) tell('compiled', path)
      else tell('compiled-missing', path, missing.map((chapter) => chapter.title).join(', '))
    } else if (compiled.error !== 'cancelled') tell('compile-failed')
  }
  const renameChapter = (file: ProjectPath, title: string) => change(() => api.renameChapter(file, title))
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
    changeContents,
    changeKinds,
    renamedFolders,
    renameFolders,
    undoFolderRenames,
    renameChapter,
    renameChapterFile,
    compile,
  }
})
