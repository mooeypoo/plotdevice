import type { Contents, NewProject, OutdatedLinkText, Placement, ProjectDetails, RelinkSuggestion } from '@plotdevice/domain'
import type { ProjectPath, Result } from '@plotdevice/shared'
import type { Revision } from './file-store'

/** A chapter file in `manuscript/`, listed in the contents or not. */
export interface ChapterFile {
  file: ProjectPath
  title?: string
  id?: string
  revision?: Revision
  /** `unreadable`: not UTF-8, or frontmatter that isn't valid YAML. Shown, never rewritten. */
  status: 'ok' | 'unreadable'
  listed: boolean
}

export interface ProjectWarning {
  file: ProjectPath
  code: string
  line?: number
  detail?: string
}

export type RecoveryOutcome = { journal: string; outcome: 'completed' } | { journal: string; outcome: 'needs-attention'; files: ProjectPath[] }

/** Everything known about an open project at one moment. Changes start from a snapshot and return a new one. */
export interface ProjectSnapshot {
  root: string
  details: ProjectDetails
  contents: Contents
  /** Changes to the contents are refused if `CONTENTS.md` no longer has this revision (ADR 0005). */
  contentsRevision: Revision
  chapters: ChapterFile[]
  /** Listed in the contents, but no such file. */
  missing: ProjectPath[]
  outdatedLinkText: OutdatedLinkText[]
  relinkSuggestions: RelinkSuggestion[]
  duplicateIds: { id: string; files: ProjectPath[] }[]
  warnings: ProjectWarning[]
  /** Interrupted file renames found and handled while opening. */
  recovered: RecoveryOutcome[]
}

export type ContentsChange =
  | { kind: 'add-chapter'; title: string; placement: Placement; text?: string }
  | { kind: 'add-to-book'; file: ProjectPath; placement: Placement }
  | { kind: 'move-chapter'; file: ProjectPath; placement: Placement }
  | { kind: 'remove-from-book'; file: ProjectPath }
  | { kind: 'add-part'; name: string; index: number }
  | { kind: 'rename-part'; part: number; name: string }
  | { kind: 'relink'; missing: ProjectPath; found: ProjectPath }
  | { kind: 'update-link-text'; file: ProjectPath }

export type OpenProblem = 'not-a-project' | 'unreadable-project-file' | 'unreadable-contents' | 'newer-format' | 'io'
export type CreateProblem = 'invalid-details' | 'folder-exists' | 'inside-project' | 'io'
/** `stale`: a file changed outside the app since the snapshot; reopen and try again. */
export type ChangeProblem = 'stale' | 'invalid' | 'not-found' | 'unreadable' | 'write-failed'
export type RenameFileProblem = ChangeProblem | 'invalid-name' | 'name-taken'

export interface ChapterText {
  /** The chapter's text without its frontmatter. */
  text: string
  revision: Revision
}

/**
 * A project's persistence: the files of DOMAIN_AND_FILE_FORMAT.md, read and changed safely (ADR 0003,
 * 0005, 0006). Implemented by `storage`. Domain rules are checked before anything is written.
 */
export interface ProjectRepository {
  create(location: string, project: NewProject): Promise<Result<ProjectSnapshot, CreateProblem>>
  open(root: string): Promise<Result<ProjectSnapshot, OpenProblem>>
  changeContents(snapshot: ProjectSnapshot, change: ContentsChange): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /** Writes the chapter's frontmatter first, then its line in `CONTENTS.md` (Milestone 2, decision 3). */
  renameChapter(snapshot: ProjectSnapshot, file: ProjectPath, title: string): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /** Renames a chapter's file and fixes every link to it, through the recovery journal. */
  renameChapterFile(snapshot: ProjectSnapshot, file: ProjectPath, newName: string): Promise<Result<{ snapshot: ProjectSnapshot; linksUpdated: number; filesChanged: ProjectPath[] }, RenameFileProblem>>
  readChapter(root: string, file: ProjectPath): Promise<Result<ChapterText, 'missing' | 'unreadable'>>
  /** Saves the text, keeping the frontmatter as it is; refused if the file changed since `expected`. */
  saveChapter(root: string, file: ProjectPath, text: string, expected: Revision): Promise<Result<Revision, 'stale' | 'missing' | 'unreadable' | 'write-failed'>>
}
