import type { ProjectPath } from '../../../shared-kernel/project-path'

/** What the manuscript's commands need to know about the open project. */
export interface ManuscriptSettings {
  /** True when the app must not write to this project. */
  readonly readOnly: boolean
  /** Where new parts go (each in its own folder); `undefined` means the project root. */
  readonly partFolder: ProjectPath | undefined
  /** Where new chapters go in a book without parts; `undefined` means the project root. */
  readonly chapterFolder: ProjectPath | undefined
  /** `settings.file_names`: whether a title change renames the file. */
  readonly fileNames: 'ask' | 'always' | 'never'
  /** The book's words, read on each use so a language change applies at once (ADR 0019). */
  readonly words: () => ManuscriptWords
}

/** The words new manuscript entries are written with, in the book's language. */
export interface ManuscriptWords {
  /** The title a new chapter gets when the writer leaves the name empty. */
  readonly untitledChapter: string
  /** The title a new part gets when the writer leaves the name empty. */
  readonly untitledPart: string
  /** The statuses offered when novel.md lists none. */
  readonly statuses: readonly string[]
}
