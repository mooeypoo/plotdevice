import type { ProjectPath } from '../../../shared-kernel/project-path'
import type { CodexKind } from './codex-entry'

/** What the codex's commands need to know about the open project. */
export interface CodexSettings {
  readonly readOnly: boolean
  /** Where new entries of each kind go; `undefined` means the project root. */
  readonly folders: Readonly<Record<CodexKind, ProjectPath | undefined>>
  /** Where the templates for new entries live (`character.md`, …); not listed as entries. */
  readonly templateFolder: ProjectPath | undefined
  /** `settings.file_names`: whether a title change renames the file. */
  readonly fileNames: 'ask' | 'always' | 'never'
  /** The book's words, read on each use so a language change applies at once (ADR 0019). */
  readonly words: () => CodexWords
}

/** The words new codex entries are written with, in the book's language. */
export interface CodexWords {
  /** The title a new entry gets when the writer leaves the name empty. */
  readonly untitled: Readonly<Record<CodexKind, string>>
  /** The headings a new entry starts with when the project has no template for its kind. */
  readonly headings: Readonly<Record<CodexKind, readonly string[]>>
}
