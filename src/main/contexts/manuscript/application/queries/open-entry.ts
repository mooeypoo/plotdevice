import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import type {
  EntryText,
  ManuscriptRepository,
  ReadEntryTextError
} from '../../domain/ports/manuscript-repository'
import { countWords } from '../../domain/word-count'

/** A part's or chapter's prose, ready for the editor. */
export interface OpenedEntry extends EntryText {
  readonly wordCount: number
}

/** Reads the prose of a part or chapter. */
export type OpenEntry = (path: ProjectPath) => Promise<Result<OpenedEntry, ReadEntryTextError>>

/** Builds the `OpenEntry` query. */
export function createOpenEntry(ports: { readonly repository: ManuscriptRepository }): OpenEntry {
  return async (path) => {
    const read = await ports.repository.readText(path)
    return read.ok
      ? { ok: true, value: { ...read.value, wordCount: countWords(read.value.text) } }
      : read
  }
}
