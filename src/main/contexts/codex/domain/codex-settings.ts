import type { ProjectPath } from '../../../shared-kernel/project-path'
import type { CodexKind } from './codex-entry'

/** What the codex's commands need to know about the open project. */
export interface CodexSettings {
  readonly readOnly: boolean
  /** Where new entries of each kind go; `undefined` means the project root. */
  readonly folders: Readonly<Record<CodexKind, ProjectPath | undefined>>
  /** `settings.file_names`: whether a title change renames the file. */
  readonly fileNames: 'ask' | 'always' | 'never'
}
