import type {
  ContentsChangeRequest,
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
import { useApi } from '../api'

/** Something to tell the author: a message key and its parameters. */
export interface Notice {
  key: string
  params: string[]
}

/** The open project, the recent list and save statuses, shared by every screen. */
export const useProjectStore = defineStore('project', () => {
  const api = useApi()
  const opened = ref<OpenedProject | null>(null)
  const recent = ref<RecentProjectView[]>([])
  const statuses = ref<Partial<Record<ProjectPath, SaveStatusView>>>({})
  const notice = ref<Notice | null>(null)
  const project = computed(() => opened.value?.project ?? null)

  const tell = (key: string, ...params: string[]): void => {
    notice.value = { key, params }
  }

  function setProject(view: ProjectView): void {
    if (opened.value) opened.value = { ...opened.value, project: view }
  }

  async function refreshRecent(): Promise<void> {
    recent.value = await api.getRecentProjects()
  }

  async function open(request: OpenProjectRequest): Promise<void> {
    const result = await api.openProject(request)
    if (result.ok) {
      statuses.value = {}
      opened.value = result.value
      notice.value = null
    } else if (result.error !== 'cancelled') tell(`open-failed-${result.error}`)
    await refreshRecent()
  }

  async function create(details: NewProjectRequest): Promise<boolean> {
    const result = await api.createProject(details)
    if (result.ok) {
      statuses.value = {}
      opened.value = result.value
      notice.value = null
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
  const renameChapterFile = (file: ProjectPath, newName: string) => change(() => api.renameChapterFile(file, newName))

  api.onEvent((event) => {
    if (event.kind === 'project-changed') setProject(event.project)
    else if (event.kind === 'save-status') statuses.value = { ...statuses.value, [event.file]: event.status }
  })
  void api.getOpenProject().then((current) => {
    if (current && !opened.value) opened.value = current
  })
  void refreshRecent()

  return { opened, project, recent, statuses, notice, tell, setProject, open, create, forget, changeContents, renameChapter, renameChapterFile, compile }
})
