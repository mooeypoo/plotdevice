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
}
