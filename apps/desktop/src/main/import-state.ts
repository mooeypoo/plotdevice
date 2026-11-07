import type { NewChapter } from '@plotdevice/application'
import type { ImportPlanRequest } from '@plotdevice/contracts'
import { directionOfLanguage, splitManuscript, type SplitEdits } from '@plotdevice/domain'
import { importedChapters, type ImportedManuscript } from '@plotdevice/import'

/** The Word file being imported, kept in the main process for the whole import (Milestone 23). */
export interface ImportState {
  current: { fileName: string; manuscript: ImportedManuscript } | null
  /** After chapters were added: the file's title and author, offered to the author. */
  offeredDetails: { title?: string; author?: string } | null
}

export const createImportState = (): ImportState => ({ current: null, offeredDetails: null })

/** The largest Word file Plot Device reads; a manuscript is a few megabytes at most. */
export const MAX_WORD_FILE_BYTES = 50 * 1024 * 1024

export const editsOf = (request: ImportPlanRequest): SplitEdits => ({
  starts: request.edits.starts,
  joins: request.edits.joins,
  leftOut: request.edits.leftOut,
  names: Object.fromEntries(Object.entries(request.edits.names).map(([start, name]) => [Number(start), name])),
})

/** The chapters the author kept, as the book's new chapters: `null` when no import is under way. */
export function chaptersFromImport(state: ImportState, request: ImportPlanRequest, language: string): NewChapter[] | null {
  if (!state.current) return null
  const { manuscript } = state.current
  const plan = splitManuscript(manuscript.paragraphs, request.split, editsOf(request))
  return importedChapters(manuscript, plan, directionOfLanguage(language))
}
