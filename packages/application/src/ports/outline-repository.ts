import type { Outline, OutlineEdit, OutlineProblem } from '@plotdevice/domain'
import type { ProjectPath, Result } from '@plotdevice/shared'
import type { Revision, TextToStore } from './file-store'

export interface OutlineSummary {
  file: ProjectPath
  title: string | null
}

/** An outline as read from its file at one revision. */
export interface OutlineDocument {
  file: ProjectPath
  outline: Outline
  revision: Revision
  /** One nesting level as the file writes it, remembered so later edits keep the author's style (Spike A, finding 7). */
  nestingUnit: string | null
  /** The file's details (frontmatter) couldn't be read. The outline is still fully usable. */
  invalidDetails: boolean
}

/** `no-trash`: this computer has no Trash the app can use; nothing was deleted. */
export type OutlineDeleteProblem = 'missing' | 'no-trash' | 'write-failed'

/** `multiline-heading`: a heading written over two lines can't be renamed in place. */
export type OutlineWriteProblem = OutlineProblem | 'multiline-heading' | 'stale' | 'missing' | 'unreadable' | 'write-failed'

/**
 * Outlines as Markdown files in `outlines/` (ADR 0003): read for structure, edited by splices, every
 * write refused if the file changed since `expected` (ADR 0005). Implemented by `storage`.
 */
export interface OutlineRepository {
  listOutlines(root: string): Promise<OutlineSummary[]>
  /**
   * `about`: a page the outline is about (a character's arc); the outline starts with a link to it.
   * `starter`: a starter outline's text under its title (Milestone 19), which follows.
   */
  createOutline(
    root: string,
    title: string,
    about?: ProjectPath,
    starter?: string,
  ): Promise<Result<OutlineDocument, 'empty-text' | 'multiline-text' | 'write-failed'>>
  readOutline(root: string, file: ProjectPath): Promise<Result<OutlineDocument, 'missing' | 'unreadable'>>
  /** Applies the edit and returns the outline as now written, with the whole text it replaced (for undo). */
  editOutline(
    root: string,
    file: ProjectPath,
    edit: OutlineEdit,
    expected: Revision,
    nestingUnit: string | null,
  ): Promise<Result<{ document: OutlineDocument; previous: string }, OutlineWriteProblem>>
  /**
   * Deletes the outline the author chose to delete: to the computer's Trash, or for good once they
   * agreed to that (Milestone 20). Nothing else changes.
   */
  deleteOutline(root: string, file: ProjectPath, how: 'trash' | 'for-good'): Promise<Result<TextToStore, OutlineDeleteProblem>>
  /** Undoing a delete: writes the outline back as it was, only where no file has taken its place. */
  restoreDeletedOutline(root: string, file: ProjectPath, content: TextToStore): Promise<Result<void, 'write-failed'>>
  /** Undo: writes `text` back, only if the file is still at `expected` (the app's own last edit). */
  restoreOutline(
    root: string,
    file: ProjectPath,
    text: string,
    expected: Revision,
  ): Promise<Result<OutlineDocument, 'stale' | 'missing' | 'unreadable' | 'write-failed'>>
}
