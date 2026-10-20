import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { LinkCandidate } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import type { Chapter } from '../chapter'
import type { EntrySource } from '../entry-warnings'
import type { Part } from '../part'
import type { PropertyWrite } from '../property-changes'
import type { LinkRewrite } from '../warning-fixes'

/** Everything the manuscript is built from, read from one project. */
export interface ManuscriptFiles {
  readonly parts: readonly Part[]
  readonly chapters: readonly Chapter[]
  /** Every typed file in the project, for resolving links. */
  readonly linkCandidates: readonly LinkCandidate[]
  /** Each part's and chapter's frontmatter and body, for the warnings panel. */
  readonly sources: readonly EntrySource[]
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
  /** A part's or chapter's frontmatter values and version, for the inspector. */
  readEntryFile(path: ProjectPath): Promise<Result<EntryFile, ReadEntryTextError>>
  /**
   * Changes only the given frontmatter keys (ADR 0004). Refuses if the file no longer matches
   * `expectedVersion`; `undefined` edits whatever is there now.
   */
  writeProperties(
    path: ProjectPath,
    writes: readonly PropertyWrite[],
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string }, WritePropertiesError>>
  /** Creates a new file, and its folders. Never replaces an existing file. */
  createFile(
    path: ProjectPath,
    text: string
  ): Promise<Result<{ readonly version: string }, CreateFileError>>
  /** Rewrites links in one file, body and frontmatter; see `LinkRewrite`. */
  rewriteLinks(
    path: ProjectPath,
    decide: LinkRewrite,
    expectedVersion: string | undefined
  ): Promise<Result<{ readonly version: string; readonly count: number }, WritePropertiesError>>
  /** novel.md's frontmatter values, or `undefined` if it can't be read. */
  readNovelFrontmatter(): Promise<unknown>
  /** Changes only the given keys of novel.md. */
  writeNovelProperties(
    writes: readonly PropertyWrite[]
  ): Promise<Result<void, WritePropertiesError>>
}

/** A part's or chapter's frontmatter, read from disk. */
export interface EntryFile {
  readonly path: ProjectPath
  readonly kind: 'part' | 'chapter'
  readonly frontmatter: unknown
  readonly version: string
}

/** Why frontmatter couldn't be written. The file is untouched in every case. */
export type WritePropertiesError = WriteEntryTextError | DomainError<'cannot-edit'>

/** Why a new file couldn't be created. */
export type CreateFileError = DomainError<'already-exists' | 'write-failed'>
