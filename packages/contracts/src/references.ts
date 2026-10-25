import type { ProjectPath, Result } from '@plotdevice/shared'
import { z } from 'zod'
import { projectPathSchema } from './project'

export const referenceKindSchema = z.enum(['character', 'place', 'note'])
const referenceFile = projectPathSchema.refine((file) => /^(characters|places|notes)\/.+\.md$/.test(file))
const title = z.string().max(500)

export const referenceFileSchema = z.strictObject({ file: referenceFile })
export const createReferenceSchema = z.strictObject({ kind: referenceKindSchema, title })
export const renameReferenceSchema = z.strictObject({ file: referenceFile, title })
export const chapterLinksSchema = z.strictObject({ file: projectPathSchema })
/** The pinned shelf, in the author's order. */
export const shelfSchema = z.strictObject({ files: z.array(referenceFile).max(100) })

export type ReferenceKind = z.infer<typeof referenceKindSchema>

export interface ReferenceSummaryView {
  file: ProjectPath
  kind: ReferenceKind
  title: string
  aka: string[]
  description: string | null
}

export interface ReferencePageView extends ReferenceSummaryView {
  details: string
  invalidDetails: boolean
}

/** Something a card links to, named for display. */
export interface LinkTargetView {
  file: ProjectPath
  kind: ReferenceKind | 'chapter' | 'outline' | 'other'
  title: string
}

/** An outline card about the chapter being written, and what else it links to. */
export interface CardLinksView {
  outline: ProjectPath
  outlineTitle: string | null
  section: string | null
  card: string
  links: LinkTargetView[]
}

export type ReferenceProblem = 'no-project' | 'missing' | 'unreadable' | 'empty-text' | 'multiline-text' | 'stale' | 'write-failed'
export type ReferenceResult<T> = Result<T, ReferenceProblem>
