import type { ProjectPath, Result } from '@plotdevice/shared'
import { z } from 'zod'
import { projectPathSchema } from './project'

export const referenceKindSchema = z.enum(['character', 'place', 'note'])
const referenceFile = projectPathSchema.refine((file) => /^(characters|places|notes)\/.+\.md$/.test(file))
const title = z.string().max(500)

export const referenceFileSchema = z.strictObject({ file: referenceFile })
export const createReferenceSchema = z.strictObject({ kind: referenceKindSchema, title })
export const renameReferenceSchema = z.strictObject({ file: referenceFile, title })
export const renameReferenceFileSchema = z.strictObject({ file: referenceFile, newName: title })
export const chapterLinksSchema = z.strictObject({ file: projectPathSchema })
/** A relationship's words: one line, its link written as ordinary Markdown (ADR 0009). */
const relationshipText = z.string().max(2000)
const relationshipIndex = z.number().int().min(0).max(10_000)
export const editRelationshipSchema = z.strictObject({
  file: referenceFile,
  change: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('add'), text: relationshipText }),
    z.strictObject({ kind: z.literal('change'), index: relationshipIndex, text: relationshipText }),
    z.strictObject({ kind: z.literal('remove'), index: relationshipIndex }),
  ]),
})
/** A tag as the author typed it (Milestone 12): one line. */
const tag = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !/[\r\n]/.test(value))
export const setTagsSchema = z.strictObject({ file: referenceFile, tags: z.array(tag).max(100) })
/** "Rename everywhere" (`to`: the new name, or an existing tag to merge into) and "Remove from all pages" (`to: null`). */
export const retagSchema = z.strictObject({ from: tag, to: tag.nullable() })
/** The tags chosen on the shelf while writing in a part (`''`: outside any part); personal, in app data. */
export const shelfTagsSchema = z.strictObject({ part: z.string().max(500), tags: z.array(tag).max(50) })
/** Tag problems the author has now been told about, by key; personal, in app data. */
export const reportedTagProblemsSchema = z.strictObject({ keys: z.array(z.string().max(2000)).max(500) })
/** The pinned shelf, in the author's order. */
export const shelfSchema = z.strictObject({ files: z.array(referenceFile).max(100) })

export type ReferenceKind = z.infer<typeof referenceKindSchema>
export type RelationshipChangeRequest = z.infer<typeof editRelationshipSchema>['change']

/** "Sister of [Bea](bea.md)": the words as written, and the files the links point at. */
export interface RelationshipView {
  text: string
  links: ProjectPath[]
}

export interface ReferenceSummaryView {
  file: ProjectPath
  kind: ReferenceKind
  title: string
  aka: string[]
  tags: string[]
  description: string | null
  /** The frontmatter couldn't be read; its tags are unknown, and it is never rewritten to fix it. */
  invalidDetails: boolean
  /** The frontmatter can't be read and has a `tags:` line, so its tags are unknown. */
  unreadableTags: boolean
  relationships: RelationshipView[]
  /** Every file the page links to. */
  links: ProjectPath[]
}

export interface ReferencePageView extends ReferenceSummaryView {
  details: string
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

/** Everything that links to a page: outline cards, other pages (with their relationships to it) and chapters. */
export interface LinkedFromView {
  cards: CardLinksView[]
  pages: { file: ProjectPath; kind: ReferenceKind; title: string; relationships: string[] }[]
  chapters: { file: ProjectPath; title: string }[]
}

/** What "Rename everywhere" or "Remove from all pages" did: pages changed, and pages that couldn't be. */
export interface RetagView {
  changed: number
  skipped: { file: ProjectPath; title: string }[]
}

export type ReferenceProblem =
  'no-project' | 'missing' | 'unreadable' | 'empty-text' | 'multiline-text' | 'stale' | 'write-failed' | 'invalid-name' | 'name-taken'
export type ReferenceResult<T> = Result<T, ReferenceProblem>
