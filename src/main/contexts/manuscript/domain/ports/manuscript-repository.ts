import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { LinkCandidate } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import type { Chapter } from '../chapter'
import type { Part } from '../part'

/** Everything the manuscript is built from, read from one project. */
export interface ManuscriptFiles {
  readonly parts: readonly Part[]
  readonly chapters: readonly Chapter[]
  /** Every typed file in the project, for resolving links. */
  readonly linkCandidates: readonly LinkCandidate[]
}

/** A part's or chapter's prose as the editor gets it. */
export interface EntryText {
  readonly path: ProjectPath
  /** The body with every line ending as `\n`. */
  readonly text: string
  /** Identifies the file's content on disk, so a save can tell if it changed meanwhile. */
  readonly version: string
}

/** Why prose couldn't be read. */
export type ReadEntryTextError = DomainError<'not-found' | 'unreadable'>

/** Why prose couldn't be written. The file is untouched in every case. */
export type WriteEntryTextError = DomainError<
  'changed-on-disk' | 'not-found' | 'unreadable' | 'write-failed'
>

/** Reads and writes one project's parts and chapters. Only the body is ever written. */
export interface ManuscriptRepository {
  load(): Promise<ManuscriptFiles>
  readText(path: ProjectPath): Promise<Result<EntryText, ReadEntryTextError>>
  /**
   * Replaces the body, keeping the frontmatter bytes, BOM, and line endings. Refuses if the file
   * no longer matches `expectedVersion`; `undefined` means "overwrite whatever is there".
   */
  writeText(
    path: ProjectPath,
    text: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string }, WriteEntryTextError>>
}
