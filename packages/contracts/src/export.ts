import type { ProjectPath, Result } from '@plotdevice/shared'
import { z } from 'zod'
import { projectPathSchema } from './project'
import type { ProjectView } from './project'

// Export (Milestone 22): Word, PDF, e-book or Markdown, from one window. The page names a cover picture
// only by what the host offered it, and a saved file only by what the host said it saved.

const path = z.string().min(1).max(4096)
const detail = z.string().max(1000)

export const exportChoicesSchema = z.strictObject({
  format: z.enum(['word', 'pdf', 'epub', 'markdown']),
  titlePage: z.boolean(),
  wordCount: z.boolean(),
  headings: z.enum(['number-and-name', 'name']),
  doubleSpaced: z.boolean(),
  paper: z.enum(['a4', 'letter']),
  chapters: z.union([z.literal('all'), z.array(projectPathSchema).max(100_000)]),
  cover: path.nullable(),
})
export const exportRequestSchema = z.strictObject({
  choices: exportChoicesSchema,
  /** The title and author as typed in the window; saved to the book when they differ. */
  title: detail,
  author: detail,
})
export const exportedFileSchema = z.strictObject({ path })

export type ExportChoicesView = z.output<typeof exportChoicesSchema>
export type ExportRequest = z.input<typeof exportRequestSchema>

export interface ExportWindowView {
  /** The choices remembered for this book, or the first ones. */
  choices: ExportChoicesView
  /** The whole book's words, rounded for a title page ("about 84,000"), already formatted. */
  wordCount: string
  /** Whether the book numbers its chapters; when it doesn't, headings are only names. */
  numbered: boolean
  /** The remembered cover picture's file name; `coverMissing` when it has moved or gone. */
  coverName: string | null
  coverMissing: boolean
  /** Chapters in the contents that can't be read, named before saving. */
  unreadable: { file: ProjectPath; title: string }[]
}

export type ExportWindowResult = Result<ExportWindowView, 'no-project'>
export type ChooseCoverResult = Result<{ path: string; name: string }, 'cancelled' | 'no-project'>
export type ExportBookResult = Result<
  {
    path: string
    /** The book after the title or author typed in the window were saved. */
    project: ProjectView | null
    missing: { file: ProjectPath; title: string }[]
  },
  'cancelled' | 'no-project' | 'no-chapters' | 'cover-unreadable' | 'details-failed' | 'write-failed' | 'export-failed'
>
