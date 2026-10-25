import { err, ok, parseProjectPath, type ProjectPath, type Result } from '@plotdevice/shared'
import type { AppDataFile, AppDataWriteFailure } from '../ports/app-data-file'

export const MAX_RECENT_PROJECTS = 8

/** Where the author stopped writing, so reopening the project returns there (PRD G2). */
export interface LeftOff {
  file: ProjectPath
  /** Offset in the chapter's text, in UTF-16 code units (ADR 0003). */
  cursor: number
}

/**
 * The workspace, outline and view the author was in. `story` is a fixed internal ID, never a label,
 * so renaming the workspace never touches saved settings.
 */
export interface Place {
  workspace: 'write' | 'story'
  outline?: ProjectPath
  view?: 'board' | 'outline' | 'cards'
}

export interface RecentProject {
  root: string
  title: string
  leftOff?: LeftOff
  place?: Place
  /** Pages pinned to the reference shelf, in the author's order. */
  shelf?: ProjectPath[]
}

/** Kept in app data, never in a project folder. The first project is the one to reopen at startup. */
export interface RecentProjects {
  projects: RecentProject[]
}

/** Reads the saved list, keeping each entry that is still valid. Only text that isn't a JSON object is unreadable. */
export function parseRecentProjects(text: string): Result<RecentProjects, 'unreadable'> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return err('unreadable')
  }
  if (!isRecord(data)) return err('unreadable')
  const entries = Array.isArray(data.projects) ? data.projects : []
  const projects = entries.flatMap((entry): RecentProject[] => {
    if (!isRecord(entry) || typeof entry.root !== 'string' || typeof entry.title !== 'string') return []
    const leftOff = parseLeftOff(entry.leftOff)
    const place = parsePlace(entry.place)
    const shelf = Array.isArray(entry.shelf) ? entry.shelf.flatMap((file) => (typeof file === 'string' ? [parseProjectPath(file)] : [])).flatMap((file) => (file.ok ? [file.value] : [])) : []
    return [{ root: entry.root, title: entry.title, ...(leftOff ? { leftOff } : {}), ...(place ? { place } : {}), ...(shelf.length ? { shelf } : {}) }]
  })
  return ok({ projects: projects.slice(0, MAX_RECENT_PROJECTS) })
}

function parseLeftOff(value: unknown): LeftOff | null {
  if (!isRecord(value) || typeof value.file !== 'string' || !Number.isInteger(value.cursor) || (value.cursor as number) < 0) return null
  const file = parseProjectPath(value.file)
  return file.ok ? { file: file.value, cursor: value.cursor as number } : null
}

function parsePlace(value: unknown): Place | null {
  if (!isRecord(value) || (value.workspace !== 'write' && value.workspace !== 'story')) return null
  const outline = typeof value.outline === 'string' ? parseProjectPath(value.outline) : null
  const view = value.view === 'board' || value.view === 'outline' || value.view === 'cards' ? value.view : undefined
  return { workspace: value.workspace, ...(outline?.ok ? { outline: outline.value } : {}), ...(view ? { view } : {}) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export interface RecentProjectsSession {
  current(): RecentProjects
  /** Moves the project to the top of the list, keeping where the author left off. */
  opened(project: { root: string; title: string }): Promise<Result<void, AppDataWriteFailure>>
  leftOff(root: string, position: LeftOff): Promise<Result<void, AppDataWriteFailure>>
  place(root: string, place: Place): Promise<Result<void, AppDataWriteFailure>>
  /** The pages pinned to the reference shelf, in order. */
  pin(root: string, shelf: readonly ProjectPath[]): Promise<Result<void, AppDataWriteFailure>>
  forget(root: string): Promise<Result<void, AppDataWriteFailure>>
  idle(): Promise<void>
}

/**
 * The recent-projects list while the app runs. Changes are serialized and each starts from the list
 * the previous one left; the list in effect keeps a change even if saving it failed.
 */
export async function createRecentProjectsSession(file: AppDataFile): Promise<RecentProjectsSession> {
  let current = await load(file)
  let queue: Promise<unknown> = Promise.resolve()

  const change = (update: (projects: RecentProject[]) => RecentProject[]): Promise<Result<void, AppDataWriteFailure>> => {
    const run = queue.then(() => {
      current = { projects: update(current.projects).slice(0, MAX_RECENT_PROJECTS) }
      return file.write(`${JSON.stringify(current, null, 2)}\n`)
    })
    queue = run.catch(() => undefined)
    return run
  }

  return {
    current: () => current,
    opened: ({ root, title }) =>
      change((projects) => {
        const known = projects.find((project) => project.root === root)
        return [{ ...known, root, title }, ...projects.filter((project) => project.root !== root)]
      }),
    leftOff: (root, position) => change((projects) => projects.map((project) => (project.root === root ? { ...project, leftOff: position } : project))),
    place: (root, place) => change((projects) => projects.map((project) => (project.root === root ? { ...project, place } : project))),
    pin: (root, shelf) => change((projects) => projects.map((project) => (project.root === root ? { ...project, shelf: [...shelf] } : project))),
    forget: (root) => change((projects) => projects.filter((project) => project.root !== root)),
    idle: async () => {
      let seen: Promise<unknown> | undefined
      while (seen !== queue) {
        seen = queue
        await queue
      }
    },
  }
}

async function load(file: AppDataFile): Promise<RecentProjects> {
  const text = await file.read()
  if (text === null) return { projects: [] }
  const parsed = parseRecentProjects(text)
  if (parsed.ok) return parsed.value
  await file.setAside()
  return { projects: [] }
}
