import { err, ok, parseProjectPath, type ProjectPath, type Result } from '@plotdevice/shared'
import type { AppDataFile, AppDataWriteFailure } from '../ports/app-data-file'

export const MAX_RECENT_PROJECTS = 8
/** Chapters whose position is kept, per project; the least recently visited go first. */
export const MAX_CHAPTER_POSITIONS = 200

/** Where the author was in a chapter. Offsets in the chapter's text, in UTF-16 code units (ADR 0003), never pixels. */
export interface ChapterPosition {
  cursor: number
  /** The start of the paragraph at the top of the page. */
  top?: number
}

/** Where the author stopped writing, so reopening the project returns there (PRD G2). */
export interface LeftOff extends ChapterPosition {
  file: ProjectPath
}

/**
 * The workspace, outline and view the author was in. `story` is a fixed internal ID, never a label,
 * so renaming the workspace never touches saved settings.
 */
export interface Place {
  workspace: 'write' | 'story'
  outline?: ProjectPath
  view?: 'board' | 'outline'
}

export interface RecentProject {
  root: string
  title: string
  leftOff?: LeftOff
  /** Each chapter's position, by file, the most recently visited last. */
  positions?: Record<ProjectPath, ChapterPosition>
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
    const positions = parsePositions(entry.positions)
    const place = parsePlace(entry.place)
    const shelf = Array.isArray(entry.shelf)
      ? entry.shelf
          .flatMap((file) => (typeof file === 'string' ? [parseProjectPath(file)] : []))
          .flatMap((file) => (file.ok ? [file.value] : []))
      : []
    return [
      {
        root: entry.root,
        title: entry.title,
        ...(leftOff ? { leftOff } : {}),
        ...(positions ? { positions } : {}),
        ...(place ? { place } : {}),
        ...(shelf.length ? { shelf } : {}),
      },
    ]
  })
  return ok({ projects: projects.slice(0, MAX_RECENT_PROJECTS) })
}

function parseLeftOff(value: unknown): LeftOff | null {
  if (!isRecord(value) || typeof value.file !== 'string') return null
  const file = parseProjectPath(value.file)
  const position = parsePosition(value)
  return file.ok && position ? { file: file.value, ...position } : null
}

/** A position without a valid cursor is dropped; one with an invalid `top` keeps its cursor. */
function parsePosition(value: unknown): ChapterPosition | null {
  if (!isRecord(value) || !isOffset(value.cursor)) return null
  return { cursor: value.cursor, ...(isOffset(value.top) ? { top: value.top } : {}) }
}

function parsePositions(value: unknown): Record<ProjectPath, ChapterPosition> | null {
  if (!isRecord(value)) return null
  const positions = Object.entries(value).flatMap(([file, position]) => {
    const path = parseProjectPath(file)
    const parsed = parsePosition(position)
    return path.ok && parsed ? [[path.value, parsed] as const] : []
  })
  return positions.length ? (Object.fromEntries(positions.slice(-MAX_CHAPTER_POSITIONS)) as Record<ProjectPath, ChapterPosition>) : null
}

function isOffset(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

/** Records `position` as the most recent, keeping at most `MAX_CHAPTER_POSITIONS`. */
function withPosition(
  positions: Record<ProjectPath, ChapterPosition> | undefined,
  { file, ...position }: LeftOff,
): Record<ProjectPath, ChapterPosition> {
  const others = Object.entries(positions ?? {}).filter(([known]) => known !== file)
  return Object.fromEntries([...others, [file, position] as const].slice(-MAX_CHAPTER_POSITIONS)) as Record<ProjectPath, ChapterPosition>
}

function parsePlace(value: unknown): Place | null {
  if (!isRecord(value) || (value.workspace !== 'write' && value.workspace !== 'story')) return null
  const outline = typeof value.outline === 'string' ? parseProjectPath(value.outline) : null
  // Cards was a third view until Milestone 11; a project left in it reopens on the Board.
  const view = value.view === 'board' || value.view === 'cards' ? 'board' : value.view === 'outline' ? 'outline' : undefined
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
    leftOff: (root, position) =>
      change((projects) =>
        projects.map((project) =>
          project.root === root ? { ...project, leftOff: position, positions: withPosition(project.positions, position) } : project,
        ),
      ),
    place: (root, place) => change((projects) => projects.map((project) => (project.root === root ? { ...project, place } : project))),
    pin: (root, shelf) =>
      change((projects) => projects.map((project) => (project.root === root ? { ...project, shelf: [...shelf] } : project))),
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
