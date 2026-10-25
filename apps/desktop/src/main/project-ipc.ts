import type { ContentsChange, OpenProblem, ProjectSnapshot, RecentProjectsSession, WritingSession } from '@plotdevice/application'
import {
  channels,
  contentsChangeSchema,
  forgetRecentProjectSchema,
  leftOffSchema,
  newProjectSchema,
  openChapterSchema,
  openProjectSchema,
  renameChapterFileSchema,
  renameChapterSchema,
  resolveConflictSchema,
  saveChapterSchema,
  type CreateProjectResult,
  type OpenChapterResult,
  type OpenedProject,
  type OpenProjectResult,
  type ProjectChangeResult,
  type RecentProjectView,
  type ResolveConflictResult,
} from '@plotdevice/contracts'
import { err, ok, type Result } from '@plotdevice/shared'
import { IpcRefused, parsePayload } from './payload'
import { projectView, saveStatusView } from './views'

export interface ProjectIpcContext {
  session: WritingSession
  recent: RecentProjectsSession
  /** The native folder pickers; `null` when the author cancels. */
  chooseProjectFolder(): Promise<string | null>
  chooseNewProjectLocation(): Promise<string | null>
  folderExists(root: string): Promise<boolean>
  /** The page has sent every text that was waiting to be saved. */
  onFlushed(): void
}

export type PayloadHandler = (payload: unknown) => Promise<unknown>

/** Project and chapter calls. The page can only open folders the author chose or opened before. */
export function createProjectHandlers(context: ProjectIpcContext): Record<string, PayloadHandler> {
  const { session, recent } = context

  const recentProjects = async (): Promise<RecentProjectView[]> =>
    Promise.all(recent.current().projects.map(async ({ root, title }) => ({ root, title, available: await context.folderExists(root) })))

  /** The project, with where the author was in it last time. */
  const withPosition = (snapshot: ProjectSnapshot): OpenedProject => {
    const remembered = recent.current().projects.find((project) => project.root === snapshot.root)
    return { project: projectView(snapshot), ...(remembered?.leftOff ? { leftOff: remembered.leftOff } : {}), ...(remembered?.place ? { place: remembered.place } : {}) }
  }

  const opened = async (snapshot: ProjectSnapshot): Promise<OpenedProject> => {
    await recent.opened({ root: snapshot.root, title: snapshot.details.title })
    return withPosition(snapshot)
  }

  const changed = (result: Result<ProjectSnapshot, Exclude<ProjectChangeResult, { ok: true }>['error']>): ProjectChangeResult =>
    result.ok ? ok(projectView(result.value)) : result

  return {
    [channels.getRecentProjects]: recentProjects,

    [channels.forgetRecentProject]: async (payload) => {
      await recent.forget(parsePayload(forgetRecentProjectSchema, payload).root)
      return recentProjects()
    },

    [channels.getOpenProject]: async (): Promise<OpenedProject | null> => {
      const project = session.project()
      return project ? withPosition(project) : null
    },

    [channels.openProject]: async (payload): Promise<OpenProjectResult> => {
      const request = parsePayload(openProjectSchema, payload)
      let root: string | null
      if (request === 'choose') root = await context.chooseProjectFolder()
      else root = recent.current().projects.some((project) => project.root === request.recent) ? request.recent : null
      if (root === null) return err(request === 'choose' ? 'cancelled' : 'not-recent')
      const result = await session.openProject(root)
      return result.ok ? ok(await opened(result.value)) : err(openProblem(result.error))
    },

    [channels.createProject]: async (payload): Promise<CreateProjectResult> => {
      const { title, language, author } = parsePayload(newProjectSchema, payload)
      const location = await context.chooseNewProjectLocation()
      if (location === null) return err('cancelled')
      const result = await session.createProject(location, { title, language, ...(author ? { author } : {}) })
      return result.ok ? ok(await opened(result.value)) : result
    },

    [channels.changeContents]: async (payload) => changed(await session.changeContents(parsePayload(contentsChangeSchema, payload) satisfies ContentsChange)),

    [channels.renameChapter]: async (payload) => {
      const { file, title } = parsePayload(renameChapterSchema, payload)
      return changed(await session.renameChapter(file, title))
    },

    [channels.renameChapterFile]: async (payload): Promise<ProjectChangeResult> => {
      const { file, newName } = parsePayload(renameChapterFileSchema, payload)
      const renamed = await session.renameChapterFile(file, newName)
      return renamed.ok ? ok(projectView(renamed.value.snapshot)) : renamed
    },

    [channels.openChapter]: async (payload): Promise<OpenChapterResult> => {
      const chapter = await session.openChapter(parsePayload(openChapterSchema, payload).file)
      return chapter.ok ? ok({ ...chapter.value, status: saveStatusView(chapter.value.status) }) : chapter
    },

    [channels.saveChapter]: async (payload) => {
      const { file, text, generation } = parsePayload(saveChapterSchema, payload)
      if (!session.saveChapter(file, text, generation).ok) throw new IpcRefused('not-open')
    },

    [channels.resolveConflict]: async (payload): Promise<ResolveConflictResult> => {
      const { file, choice } = parsePayload(resolveConflictSchema, payload)
      const resolved = await session.resolveConflict(file, choice)
      const project = session.project()
      if (!resolved.ok) return resolved
      if (!project) return err('missing')
      return ok({ ...resolved.value, project: projectView(project) })
    },

    [channels.leftOff]: async (payload) => {
      const position = parsePayload(leftOffSchema, payload)
      const project = session.project()
      if (project) await recent.leftOff(project.root, position)
    },

    [channels.flushed]: async () => context.onFlushed(),
  }
}

function openProblem(problem: OpenProblem): Exclude<OpenProjectResult, { ok: true }>['error'] {
  switch (problem) {
    case 'not-a-project':
    case 'newer-format':
      return problem
    case 'unreadable-project-file':
    case 'unreadable-contents':
    case 'io':
      return 'unreadable'
  }
}
