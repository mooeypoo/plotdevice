import { parseProjectPath, type ProjectPath, type Result } from '@plotdevice/shared'
import { z } from 'zod'

/** A path inside the project, checked like any path from the page (no `..`, no absolute paths). */
export const projectPathSchema = z.string().transform((raw, context): ProjectPath => {
  const parsed = parseProjectPath(raw)
  if (!parsed.ok) context.addIssue({ code: 'custom', message: parsed.error.join(', ') })
  return raw as ProjectPath
})

const index = z.number().int().nonnegative()
const placementSchema = z.strictObject({ part: index.nullable(), index })
const name = z.string().min(1).max(500)

/** The app's own templates for new projects (Milestone 19); `blank` is always offered. */
export const templateIdSchema = z.enum(['novel', 'short-story', 'campaign', 'blank'])
/** `location`: the folder to make the project in, one the host offered (`newProjectLocation`, `chooseNewProjectLocation`). */
export const newProjectSchema = z.strictObject({
  title: name,
  language: z.string().min(2).max(35),
  author: z.string().max(500).optional(),
  template: templateIdSchema,
  location: z.string().min(1).max(4096),
})

export const contentsChangeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('add-chapter'), title: name, placement: placementSchema }),
  z.strictObject({ kind: z.literal('add-to-book'), file: projectPathSchema, placement: placementSchema }),
  z.strictObject({ kind: z.literal('move-chapter'), file: projectPathSchema, placement: placementSchema }),
  z.strictObject({ kind: z.literal('remove-from-book'), file: projectPathSchema }),
  z.strictObject({ kind: z.literal('add-part'), name, index }),
  z.strictObject({ kind: z.literal('rename-part'), part: index, name }),
  z.strictObject({ kind: z.literal('relink'), missing: projectPathSchema, found: projectPathSchema }),
  z.strictObject({ kind: z.literal('update-link-text'), file: projectPathSchema }),
])

/** A kind of page's folder (ADR 0011): one name, which the domain checks further. */
const kindFolder = z.string().min(1).max(255)
/** A change on the "Kinds of pages" screen (Milestone 18). */
export const kindsChangeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('add'), one: name, many: name, folder: kindFolder }),
  z.strictObject({ kind: z.literal('rename'), folder: kindFolder, one: name, many: name }),
  z.strictObject({ kind: z.literal('move'), folder: kindFolder, index }),
  z.strictObject({ kind: z.literal('remove'), folder: kindFolder }),
  z.strictObject({ kind: z.literal('unit'), unit: z.strictObject({ one: name, many: name }).nullable() }),
])
export type KindsChangeRequest = z.infer<typeof kindsChangeSchema>

/** "Match folder names" (Milestone 18): each kind's folder renamed to its plural. */
export const folderRenamesSchema = z.strictObject({
  renames: z
    .array(z.strictObject({ from: kindFolder, to: kindFolder }))
    .min(1)
    .max(100),
})
export type FolderRenamesRequest = z.infer<typeof folderRenamesSchema>['renames']

/** Why a folder can't be renamed: the preview says so, and nothing is renamed. */
export type FolderRenameBlockView = 'exists' | 'case-only' | 'invalid-name' | 'other-files' | 'missing'

export interface FolderRenamePlanView {
  renames: { from: string; to: string; files: number; blocked: FolderRenameBlockView | null }[]
  linksUpdated: number
  /** The files whose links will change, where they will be afterwards. */
  filesChanged: ProjectPath[]
}
export type FolderRenamePlanResult = Result<FolderRenamePlanView, 'no-project'>
export type RenameFoldersResult = Result<
  { project: ProjectView; linksUpdated: number },
  Exclude<ProjectChangeResult, { ok: true }>['error'] | 'blocked'
>
export type UndoFolderRenamesResult = Result<ProjectView, Exclude<ProjectChangeResult, { ok: true }>['error'] | 'nothing-to-undo'>

export const renameChapterSchema = z.strictObject({ file: projectPathSchema, title: name })
export const renameChapterFileSchema = z.strictObject({ file: projectPathSchema, newName: name })
export const openProjectSchema = z.union([z.strictObject({ recent: z.string().min(1) }), z.literal('choose')])
export const forgetRecentProjectSchema = z.strictObject({ root: z.string().min(1) })

export type NewProjectRequest = z.infer<typeof newProjectSchema>
/** The sample book in the interface's language (Milestone 20). */
export const sampleRequestSchema = z.strictObject({ language: z.enum(['en', 'he']) })
export type TemplateId = z.infer<typeof templateIdSchema>
export type ContentsChangeRequest = z.infer<typeof contentsChangeSchema>
export type OpenProjectRequest = z.infer<typeof openProjectSchema>

export interface ChapterRef {
  file: ProjectPath
  linkText: string
  /** As the project's numbering setting shows it; `null` when unnumbered. */
  number: number | null
}

/** The project as the page shows it. Revisions and other bookkeeping stay in the main process. */
export interface ProjectView {
  root: string
  title: string
  author?: string
  language: string
  /** The book's text direction, from its language. */
  direction: 'ltr' | 'rtl'
  chapterNumbering: 'continuous' | 'per-part' | 'none'
  contents: (({ kind: 'chapter' } & ChapterRef) | { kind: 'part'; name: string; chapters: ChapterRef[] })[]
  chapters: { file: ProjectPath; title?: string; status: 'ok' | 'unreadable'; listed: boolean }[]
  missing: ProjectPath[]
  outdatedLinkText: { file: ProjectPath; linkText: string; title: string }[]
  relinkSuggestions: { missing: ProjectPath; found: ProjectPath; reason: 'same-id' | 'same-title' }[]
  duplicateIds: { id: string; files: ProjectPath[] }[]
  warnings: { file: ProjectPath; code: string; line?: number }[]
  /** The book's kinds of pages, in sidebar order: a folder and, for the author's own, its names (ADR 0011). */
  kinds: { folder: string; one?: string; many?: string }[]
  /** What the interface calls a chapter in this book, or `null` for the app's own word. */
  manuscriptUnit: { one: string; many: string } | null
  /** Tags "+ Tag" offers before any page uses them (Milestone 19). */
  suggestedTags: string[]
  /** Kinds whose folder isn't named after them (yet): what "Match folder names" would rename. */
  folderMismatches: { from: string; to: string }[]
}

export interface RecentProjectView {
  root: string
  title: string
  /** False when the folder has moved or is gone: shown with "Find…" and "Remove from list". */
  available: boolean
  /** The sample book to try (Milestone 20), shown as such. */
  sample?: true
}

/** Where the author was in a chapter: offsets in its text, never pixels. */
export interface ChapterPosition {
  cursor: number
  /** The start of the paragraph at the top of the page. */
  top?: number
}

export interface OpenedProject {
  project: ProjectView
  /** The sample book to try (Milestone 20): a copy in the app's own data, with "Start the sample over". */
  sample?: true
  /** Where the author stopped writing last time, to reopen there. */
  leftOff?: { file: ProjectPath } & ChapterPosition
  /** Where the author was in each chapter. */
  positions?: Record<ProjectPath, ChapterPosition>
  /** The workspace, outline and view the author was in. */
  place?: { workspace: 'write' | 'story'; outline?: ProjectPath; view?: 'board' | 'outline' }
}

/** `cancelled`: the author closed the folder dialog. */
export type OpenProjectResult = Result<OpenedProject, 'cancelled' | 'not-a-project' | 'unreadable' | 'newer-format' | 'not-recent'>
export type CreateProjectResult = Result<OpenedProject, 'cancelled' | 'invalid-details' | 'folder-exists' | 'inside-project' | 'io'>
export type ProjectChangeResult = Result<
  ProjectView,
  | 'stale'
  | 'invalid'
  | 'not-found'
  | 'unreadable'
  | 'write-failed'
  | 'invalid-name'
  | 'name-taken'
  | 'no-project'
  // Kinds of pages (ADR 0011).
  | 'empty-name'
  | 'folder-taken'
  | 'invalid-folder'
  | 'invalid-kinds'
>

/** The compiled book was written to `path`; `missing` chapters couldn't be read and are not in it. */
export type CompileResult = Result<
  { path: string; missing: { file: ProjectPath; title: string }[] },
  'cancelled' | 'no-project' | 'write-failed'
>
