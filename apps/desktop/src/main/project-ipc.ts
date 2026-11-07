import type {
  ContentsChange,
  OpenProblem,
  ProjectSnapshot,
  ProjectTemplate,
  RecentProjectsSession,
  WritingSession,
} from '@plotdevice/application'
import {
  channels,
  contentsChangeSchema,
  forgetRecentProjectSchema,
  leftOffSchema,
  newProjectSchema,
  sampleRequestSchema,
  openChapterSchema,
  openProjectSchema,
  renameChapterFileSchema,
  kindsChangeSchema,
  folderRenamesSchema,
  type FolderRenamePlanResult,
  type RenameFoldersResult,
  type UndoFolderRenamesResult,
  renameChapterSchema,
  resolveConflictSchema,
  saveChapterSchema,
  type CreateProjectResult,
  type TemplateId,
  type OpenChapterResult,
  type OpenedProject,
  type OpenProjectResult,
  type ProjectChangeResult,
  type RecentProjectView,
  type ResolveConflictResult,
} from '@plotdevice/contracts'
import { outlineFileFor } from '@plotdevice/domain'
import { dirname } from 'node:path'
import { err, ok, type Result } from '@plotdevice/shared'
import { IpcRefused, parsePayload } from './payload'
import { projectView, saveStatusView } from './views'

export interface ProjectIpcContext {
  session: WritingSession
  recent: RecentProjectsSession
  /** The native folder pickers; `null` when the author cancels. */
  chooseProjectFolder(): Promise<string | null>
  chooseNewProjectLocation(): Promise<string | null>
  /** Where new projects go before the author has made one: Documents. */
  defaultProjectLocation: string
  /** A template in the story's language (Milestone 19). */
  template(id: TemplateId, language: string): ProjectTemplate
  folderExists(root: string): Promise<boolean>
  /** The page has sent every text that was waiting to be saved. */
  onFlushed(): void
  /** Before another book opens (or a new one is made): the open book's backup, if one is due (Milestone 20). */
  leavingBook(): Promise<void>
  /** The sample book's copy in app data, made from the bundled one if needed, or afresh (Milestone 20). */
  sampleBook(language: 'en' | 'he', fresh: boolean): Promise<string>
  /** Whether `root` is a sample book's copy. */
  isSample(root: string): boolean
}

export type PayloadHandler = (payload: unknown) => Promise<unknown>

/** Project and chapter calls. The page can only open folders the author chose or opened before. */
export function createProjectHandlers(context: ProjectIpcContext): Record<string, PayloadHandler> {
  const { session, recent } = context

  const recentProjects = async (): Promise<RecentProjectView[]> =>
    Promise.all(
      recent.current().projects.map(async ({ root, title }) => ({
        root,
        title,
        available: await context.folderExists(root),
        ...(context.isSample(root) ? { sample: true as const } : {}),
      })),
    )

  const withPosition = (snapshot: ProjectSnapshot): OpenedProject => ({
    ...openedProject(snapshot, recent),
    ...(context.isSample(snapshot.root) ? { sample: true as const } : {}),
  })

  // A new project goes only into a folder this host offered: the default, or one the author chose.
  const offered = new Set<string>()
  const offer = (location: string): string => {
    offered.add(location)
    return location
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
      await context.leavingBook()
      const result = await session.openProject(root)
      return result.ok ? ok(await opened(result.value)) : err(openProblem(result.error))
    },

    [channels.openSample]: async (payload): Promise<OpenProjectResult> => {
      const { language } = parsePayload(sampleRequestSchema, payload)
      await context.leavingBook()
      const result = await session.openProject(await context.sampleBook(language, false))
      return result.ok ? ok(await opened(result.value)) : err(openProblem(result.error))
    },

    // Only the open sample, and only its copy in app data: never a folder of the author's.
    [channels.restartSample]: async (): Promise<OpenProjectResult> => {
      const project = session.project()
      if (!project || !context.isSample(project.root)) return err('not-recent')
      await session.idle()
      const language = project.details.language.startsWith('he') ? 'he' : 'en'
      const result = await session.openProject(await context.sampleBook(language, true))
      return result.ok ? ok(await opened(result.value)) : err(openProblem(result.error))
    },

    [channels.createProject]: async (payload): Promise<CreateProjectResult> => {
      const { title, language, author, template, location } = parsePayload(newProjectSchema, payload)
      if (!offered.has(location)) throw new IpcRefused('not-offered')
      const details = { title, language, ...(author ? { author } : {}) }
      const start = context.template(template, language)
      await context.leavingBook()
      const result = await session.createProject(location, details, start)
      if (!result.ok) return result
      // A book with nothing to write in yet opens on its first outline: a campaign on its session plan.
      const outline = result.value.chapters.length === 0 ? start.outlines[0] : undefined
      const project = await opened(result.value)
      return ok(outline ? { ...project, place: { workspace: 'story', outline: outlineFileFor(outline.title, []) } } : project)
    },

    // Beside the last project opened, so a writer's books stay together; Documents for the first one.
    [channels.newProjectLocation]: async (): Promise<string> => {
      const last = recent.current().projects[0]
      const beside = last ? dirname(last.root) : null
      return offer(beside !== null && (await context.folderExists(beside)) ? beside : context.defaultProjectLocation)
    },

    [channels.chooseNewProjectLocation]: async (): Promise<string | null> => {
      const location = await context.chooseNewProjectLocation()
      return location === null ? null : offer(location)
    },

    [channels.changeContents]: async (payload) =>
      changed(await session.changeContents(parsePayload(contentsChangeSchema, payload) satisfies ContentsChange)),

    [channels.changeKinds]: async (payload) => changed(await session.changeKinds(parsePayload(kindsChangeSchema, payload))),

    [channels.planFolderRenames]: async (payload): Promise<FolderRenamePlanResult> =>
      session.planFolderRenames(parsePayload(folderRenamesSchema, payload).renames),

    [channels.renameFolders]: async (payload): Promise<RenameFoldersResult> => {
      const renamed = await session.renameFolders(parsePayload(folderRenamesSchema, payload).renames)
      return renamed.ok ? ok({ project: projectView(renamed.value.snapshot), linksUpdated: renamed.value.linksUpdated }) : renamed
    },

    [channels.undoFolderRenames]: async (): Promise<UndoFolderRenamesResult> => {
      const undone = await session.undoFolderRenames()
      return undone.ok ? ok(projectView(undone.value)) : undone
    },

    [channels.renameChapter]: async (payload) => {
      const { file, title } = parsePayload(renameChapterSchema, payload)
      return changed(await session.renameChapter(file, title))
    },

    [channels.renameChapterFile]: async (payload): Promise<ProjectChangeResult> => {
      const { file, newName } = parsePayload(renameChapterFileSchema, payload)
      const renamed = await session.renameFile(file, newName)
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
      const { file, cursor, top } = parsePayload(leftOffSchema, payload)
      const project = session.project()
      if (project) await recent.leftOff(project.root, { file, cursor, ...(top === undefined ? {} : { top }) })
    },

    [channels.flushed]: async () => context.onFlushed(),
  }
}

/** The project, with where the author was in it last time. */
export function openedProject(snapshot: ProjectSnapshot, recent: RecentProjectsSession): OpenedProject {
  const remembered = recent.current().projects.find((project) => project.root === snapshot.root)
  return {
    project: projectView(snapshot),
    ...(remembered?.leftOff ? { leftOff: remembered.leftOff } : {}),
    ...(remembered?.positions ? { positions: remembered.positions } : {}),
    ...(remembered?.place ? { place: remembered.place } : {}),
  }
}

export function openProblem(problem: OpenProblem): 'not-a-project' | 'newer-format' | 'unreadable' {
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
