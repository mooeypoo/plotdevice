import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type {
  ManuscriptRepository,
  WriteEntryTextError
} from '../../domain/ports/manuscript-repository'
import { countWords } from '../../domain/word-count'

/** What a save produced. */
export interface SavedEntry {
  readonly version: string
  readonly wordCount: number
}

/** Why a save didn't happen. The file is untouched. */
export type SaveEntryTextError = WriteEntryTextError | DomainError<'read-only'>

/**
 * Saves the prose of a part or chapter: only its body changes. Unless `overwrite` is set, a file
 * that changed on disk since `version` was read is left alone and the save is refused.
 */
export type SaveEntryText = (
  path: ProjectPath,
  text: string,
  version: string,
  overwrite: boolean
) => Promise<Result<SavedEntry, SaveEntryTextError>>

/** Builds the `SaveEntryText` command. */
export function createSaveEntryText(ports: {
  readonly repository: ManuscriptRepository
  /** True when the project is open read-only (a newer format, an unreadable novel.md). */
  readonly readOnly: boolean
}): SaveEntryText {
  return async (path, text, version, overwrite) => {
    if (ports.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    const written = await ports.repository.writeText(path, text, overwrite ? undefined : version)
    if (!written.ok) return written
    return ok({ version: written.value.version, wordCount: countWords(text) })
  }
}
