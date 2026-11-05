import type { ProjectPath, Result } from '@plotdevice/shared'
import { z } from 'zod'
import { projectPathSchema } from './project'
import { referenceFile } from './references'

const index = z.number().int().nonnegative()
const path = z.array(index).max(64)
const line = z.string().max(2000)
const itemPath = z.strictObject({ section: index, path: path.min(1) })
const destination = z.strictObject({ section: index, parentPath: path, index })
const outlineFile = projectPathSchema.refine((file) => file.startsWith('outlines/') && file.endsWith('.md'))
/** A section of another outline (ADR 0012): its file, its heading's anchor, and the link's text. */
const lineUp = z.strictObject({ outline: outlineFile, anchor: line.min(1), text: line.min(1) })

/** One edit to an outline (ADR 0003). Text is one line; the domain checks the rest. */
export const outlineEditSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('move-item'), from: itemPath, to: destination }),
  z.strictObject({ kind: z.literal('rename-item'), at: itemPath, text: line }),
  z.strictObject({ kind: z.literal('add-item'), to: destination, text: line }),
  z.strictObject({ kind: z.literal('delete-item'), at: itemPath }),
  z.strictObject({ kind: z.literal('rename-section'), section: index, text: line }),
  z.strictObject({ kind: z.literal('add-section'), index, text: line }),
  z.strictObject({ kind: z.literal('move-section'), section: index, index }),
  z.strictObject({ kind: z.literal('delete-section'), section: index }),
  z.strictObject({ kind: z.literal('set-title'), text: line }),
  // `words` go before the link, in the project's language: "At the same time as ".
  z.strictObject({ kind: z.literal('line-up-section'), section: index, lineUp, words: line }),
  z.strictObject({ kind: z.literal('unpin-section'), section: index }),
])

export const outlineFileSchema = z.strictObject({
  file: outlineFile,
})
/** Set an outline aside, or bring it back (Milestone 20). */
export const setOutlineAsideSchema = z.strictObject({ file: outlineFile, aside: z.boolean() })
/** Delete an outline: to the computer's Trash, or for good once the author agreed to that. */
export const deleteOutlineSchema = z.strictObject({ file: outlineFile, how: z.enum(['trash', 'for-good']) })
export const editOutlineSchema = z.strictObject({ file: outlineFileSchema.shape.file, edit: outlineEditSchema })
/** The starter outlines "New outline" offers (Milestone 19); the texts live in `packages/templates`. */
export const starterSchema = z.enum(['three-acts', 'story-beats', 'character-arc', 'campaign-arc', 'session-plan'])
/**
 * `about`: a page the outline is about; it starts with a link to that page. `starter`: the starter
 * outline it begins with, in the story's language.
 */
export const createOutlineSchema = z.strictObject({ title: line, about: referenceFile.optional(), starter: starterSchema.optional() })

/**
 * The workspace the author is in. `story` is a fixed internal ID, never shown: the workspace's name
 * comes only from the message catalogs, so it can be renamed without touching code or saved settings.
 */
export const workspaceSchema = z.enum(['write', 'story'])
export const outlineViewKindSchema = z.enum(['board', 'outline'])
export const placeSchema = z.strictObject({
  workspace: workspaceSchema,
  outline: outlineFileSchema.shape.file.optional(),
  view: outlineViewKindSchema.optional(),
})

export type OutlineEditRequest = z.infer<typeof outlineEditSchema>
export type StarterId = z.infer<typeof starterSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type OutlineViewKind = z.infer<typeof outlineViewKindSchema>
export type Place = z.infer<typeof placeSchema>

export interface OutlineItemView {
  /** As written, inline Markdown included; the interface shows it formatted. */
  text: string
  checked: boolean | null
  children: OutlineItemView[]
  /** Content after the first line, shown "kept as written". */
  keptAsWritten: string[]
  movable: boolean
}

export interface OutlineSectionView {
  /** `null` for cards before the first section. */
  name: string | null
  intro: string[]
  items: OutlineItemView[]
  notes: { kind: 'group' | 'kept'; text: string; before: number }[]
  /** The section of another outline this one is lined up with (ADR 0012), as written; `null` if none. */
  lineUp: { outline: ProjectPath; anchor: string; text: string } | null
}

export interface OutlineView {
  file: ProjectPath
  title: string | null
  preamble: string[]
  sections: OutlineSectionView[]
  canUndo: boolean
  /** The file's details (frontmatter) couldn't be read; the outline still works. */
  invalidDetails: boolean
}

export interface OutlineSummaryView {
  file: ProjectPath
  title: string | null
}

export type OutlineProblem =
  | 'no-project'
  | 'missing'
  | 'unreadable'
  | 'not-open'
  | 'no-such-item'
  | 'no-such-section'
  | 'index-out-of-range'
  | 'into-own-subtree'
  | 'unmovable-item'
  | 'unnamed-section'
  | 'empty-text'
  | 'multiline-text'
  | 'multiline-heading'
  | 'changed-elsewhere'
  | 'nothing-to-undo'
  | 'write-failed'
  | 'same-outline'

export type OutlineResult = Result<OutlineView, OutlineProblem>
