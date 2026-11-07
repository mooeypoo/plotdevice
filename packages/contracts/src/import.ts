import type { Result } from '@plotdevice/shared'
import { z } from 'zod'
import { importPlanSchema } from './import-plan'
import type { ProjectChangeResult, ProjectView } from './project'

// Bringing in a Word file (Milestone 23). The manuscript stays in the main process for the whole
// import; the page only asks for the chapters again as the author changes how it splits.

export const importStartSchema = z.strictObject({ purpose: z.enum(['new', 'add']) })
export const addImportedSchema = z.strictObject({ plan: importPlanSchema, partName: z.string().trim().min(1).max(500) })

export { importPlanSchema, splitEditsSchema, type ImportPlanRequest, type SplitByView } from './import-plan'
import type { SplitByView } from './import-plan'

export interface ImportParagraphView {
  text: string
  kind: 'paragraph' | 'heading' | 'quote' | 'list-item'
  /** Word's Title style. */
  title: boolean
}

export interface ImportPlanView {
  split: SplitByView
  chapters: { start: number; part: string | null; name: string; words: number; included: boolean; body: number[] }[]
}

export interface ImportStartView {
  fileName: string
  paragraphs: ImportParagraphView[]
  plan: ImportPlanView
  leftOut: { comments: number; pictures: number; tables: number }
  footnotes: number
  /** For a new book: from the file's own details, or else its title page. */
  title: string | null
  author: string | null
  /** The book's language, guessed from the text. */
  language: 'he' | 'en'
}

export type ImportStartResult = Result<
  ImportStartView,
  'cancelled' | 'too-big' | 'not-a-word-file' | 'old-or-protected' | 'unreadable' | 'no-project'
>
export type ImportPlanResult = Result<ImportPlanView, 'no-import'>
export type AddImportedResult = Result<
  {
    project: ProjectView
    added: number
    /** The Word file's title and author, when they differ from the book's: offered, never applied. */
    fileDetails: { title: string | null; author: string | null } | null
  },
  'no-import' | 'no-chapters' | Extract<ProjectChangeResult, { ok: false }>['error']
>
