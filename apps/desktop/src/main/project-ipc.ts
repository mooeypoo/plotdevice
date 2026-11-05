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
  openChapterSchema,
  openProjectSchema,
  renameChapterFileSchema,
  kindsChangeSchema,
  folderRenamesSchema,
  type BackupBookResult,
  type FolderRenamePlanResult,
  type RenameFoldersResult,
  type UndoFolderRenamesResult,
  renameChapterSchema,
  resolveConflictSchema,
  saveChapterSchema,
  type CompileResult,
  type CreateProjectResult,
  type TemplateId,
  type OpenChapterResult,
  type OpenedProject,
  type OpenProjectResult,
  type ProjectChangeResult,
  type RecentProjectView,
  type ResolveConflictResult,
} from '@plotdevice/contracts'
import { outlineFileFor, projectFolderName } from '@plotdevice/domain'
import { dirname, join } from 'node:path'
import { err, ok, type ProjectPath, type Result } from '@plotdevice/shared'
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
  /** The native save dialog, suggesting `suggested`; `null` when the author cancels. */
  chooseSaveLocation(suggested: string): Promise<string | null>
  /** Puts the book together; written by the caller where the author chose. */
  compile(snapshot: ProjectSnapshot): Promise<{ text: string; missing: ProjectPath[] }>
  /** Writes a file outside the project, atomically. */
  writeOutside(path: string, text: string): Promise<boolean>
  /** The folder picker for a backup; `null` when the author cancels. */
  chooseBackupLocation(): Promise<string | null>
  /** Copies the book folder into `location` under a new name; the copy's path, or `null` when it failed. */
  copyBook(root: string, location: string): Promise<string | null>
}

export type PayloadHandler = (payload: unknown) => Promise<unknown>

/** Project and chapter calls. The page can only open folders the author chose or opened before. */
export function createProjectHandlers(context: ProjectIpcContext): Record<string, PayloadHandler> {
  const { session, recent } = context

  const recentProjects = async (): Promise<RecentProjectView[]> =>
    Promise.all(recent.current().projects.map(async ({ root, title }) => ({ root, title, available: await context.folderExists(root) })))

  const withPosition = (snapshot: ProjectSnapshot): OpenedProject => openedProject(snapshot, recent)

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
      const result = await session.openProject(root)
      return result.ok ? ok(await opened(result.value)) : err(openProblem(result.error))
    },

    [channels.createProject]: async (payload): Promise<CreateProjectResult> => {
      const { title, language, author, template, location } = parsePayload(newProjectSchema, payload)
      if (!offered.has(location)) throw new IpcRefused('not-offered')
      const details = { title, language, ...(author ? { author } : {}) }
      const start = context.template(template, language)
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

    [channels.backupBook]: async (): Promise<BackupBookResult> => {
      const project = session.project()
      if (!project) return err('no-project')
      await session.idle()
      const location = await context.chooseBackupLocation()
      if (location === null) return err('cancelled')
      const path = await context.copyBook(project.root, location)
      return path === null ? err('failed') : ok({ path })
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

    [channels.compileBook]: async (): Promise<CompileResult> => {
      const project = session.project()
      if (!project) return err('no-project')
      // Suggested next to the project folder, never inside it, so the novel's folder stays the author's.
      const path = await context.chooseSaveLocation(join(dirname(project.root), `${projectFolderName(project.details.title)}.md`))
      if (path === null) return err('cancelled')
      const { text, missing } = await context.compile(project)
      if (!(await context.writeOutside(path, text))) return err('write-failed')
      const titles = new Map(
        project.contents.entries
          .flatMap((entry) => (entry.kind === 'chapter' ? [entry] : entry.chapters))
          .map((chapter) => [chapter.file, chapter.linkText]),
      )
      return ok({ path, missing: missing.map((file) => ({ file, title: titles.get(file) ?? file })) })
    },
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
