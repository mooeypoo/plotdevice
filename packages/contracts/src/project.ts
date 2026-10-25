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

export const newProjectSchema = z.strictObject({ title: name, language: z.string().min(2).max(35), author: z.string().max(500).optional() })

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

export const renameChapterSchema = z.strictObject({ file: projectPathSchema, title: name })
export const renameChapterFileSchema = z.strictObject({ file: projectPathSchema, newName: name })
export const openProjectSchema = z.union([z.strictObject({ recent: z.string().min(1) }), z.literal('choose')])
export const forgetRecentProjectSchema = z.strictObject({ root: z.string().min(1) })

export type NewProjectRequest = z.infer<typeof newProjectSchema>
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
}

export interface RecentProjectView {
  root: string
  title: string
  /** False when the folder has moved or is gone: shown with "Find…" and "Remove from list". */
  available: boolean
}

export interface OpenedProject {
  project: ProjectView
  /** Where the author stopped last time, to reopen there. */
  leftOff?: { file: ProjectPath; cursor: number }
}

/** `cancelled`: the author closed the folder dialog. */
export type OpenProjectResult = Result<OpenedProject, 'cancelled' | 'not-a-project' | 'unreadable' | 'newer-format' | 'not-recent'>
export type CreateProjectResult = Result<OpenedProject, 'cancelled' | 'invalid-details' | 'folder-exists' | 'inside-project' | 'io'>
export type ProjectChangeResult = Result<ProjectView, 'stale' | 'invalid' | 'not-found' | 'unreadable' | 'write-failed' | 'invalid-name' | 'name-taken' | 'no-project'>
