import type {
  Contents,
  FolderRename,
  ManuscriptUnit,
  NewProject,
  OutdatedLinkText,
  PageKind,
  Placement,
  ProjectDetails,
  RelinkSuggestion,
} from '@plotdevice/domain'
import type { ProjectPath, Result } from '@plotdevice/shared'
import type { Revision } from './file-store'
import type { JournalEntry } from './journal-store'

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

export type RecoveryOutcome =
  { journal: string; outcome: 'completed' } | { journal: string; outcome: 'needs-attention'; files: ProjectPath[] }

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

/** Why a folder can't be renamed to match its kind (ADR 0011, decision 7). */
export type FolderRenameBlock = 'exists' | 'case-only' | 'invalid-name' | 'other-files' | 'missing'

/** The preview of "Match folder names…": each folder, its pages, what stops it, and the links that will change. */
export interface FolderRenamePlan {
  renames: { from: string; to: string; files: number; blocked: FolderRenameBlock | null }[]
  linksUpdated: number
  /** Files whose links change, where they will be afterwards. */
  filesChanged: ProjectPath[]
}

/** What "Undo folder renames" needs: the reverse operation, kept for the session only. */
export interface FolderRenameUndo {
  entry: JournalEntry
  /** The renames it undoes; their new folders are removed again once empty. */
  renames: FolderRename[]
}
export type RenameFileProblem = ChangeProblem | 'invalid-name' | 'name-taken'

export interface FileRenamed {
  snapshot: ProjectSnapshot
  /** The chapter's new path. */
  file: ProjectPath
  linksUpdated: number
  /** Files whose text changed because their links were updated. */
  filesChanged: ProjectPath[]
}

/**
 * What a new project starts with besides its details (Milestone 19): a template's kinds, chapter word,
 * suggested tags, first chapter and outlines. Nothing records which template it was.
 */
/** A chapter brought in from a Word file (Milestone 23): its title, its part (or none), and its text as Markdown. */
export interface NewChapter {
  title: string
  part: string | null
  body: string
}

export interface ProjectTemplate {
  /** `null` for the three default kinds. */
  kinds: readonly PageKind[] | null
  manuscriptUnit: ManuscriptUnit | null
  suggestedTags: readonly string[]
  /** One empty chapter, named after the book. */
  firstChapter: boolean
  /** Each outline's title, and its text under the title line. */
  outlines: readonly { title: string; body: string }[]
}

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
  /** Makes the folder, never over an existing one, then the template's files, if any. */
  /** A new book in a new folder; with `chapters`, a book made from a Word file (Milestone 23), in their order and parts. */
  create(
    location: string,
    project: NewProject,
    template?: ProjectTemplate,
    chapters?: readonly NewChapter[],
  ): Promise<Result<ProjectSnapshot, CreateProblem>>
  /**
   * Adds chapters at the end of the book (Milestone 23): their files first, each as a new file, then
   * their parts and lines in `CONTENTS.md`. If that last step fails, the chapters are still there, not
   * in the book, and nothing is lost. The book's details don't change.
   */
  addChapters(snapshot: ProjectSnapshot, chapters: readonly NewChapter[]): Promise<Result<ProjectSnapshot, ChangeProblem>>
  open(root: string): Promise<Result<ProjectSnapshot, OpenProblem>>
  changeContents(snapshot: ProjectSnapshot, change: ContentsChange): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /** Writes the chapter's frontmatter first, then its line in `CONTENTS.md` (Milestone 2, decision 3). */
  renameChapter(snapshot: ProjectSnapshot, file: ProjectPath, title: string): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /**
   * Renames a chapter's file, or a character, place or note page's, and fixes every link to it,
   * through the recovery journal. Only a chapter's line in `CONTENTS.md` changes with it.
   */
  renameFile(snapshot: ProjectSnapshot, file: ProjectPath, newName: string): Promise<Result<FileRenamed, RenameFileProblem>>
  /**
   * Puts a backup's Markdown files back in the book (Milestone 20), through the recovery journal: each
   * file that differs is written, and a file the book no longer has is written anew. Files the backup
   * doesn't have are left as they are. The caller backs up the book as it is first.
   */
  restoreFiles(
    snapshot: ProjectSnapshot,
    files: readonly { path: ProjectPath; text: string; hasBom: boolean }[],
  ): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /** "Match folder names…": what renaming these folders would do, changing nothing. */
  planFolderRenames(snapshot: ProjectSnapshot, renames: readonly FolderRename[]): Promise<FolderRenamePlan>
  /** Renames the folders, every link to them and the kinds in `project.md`, as one journalled operation (ADR 0005). */
  renameFolders(
    snapshot: ProjectSnapshot,
    renames: readonly FolderRename[],
  ): Promise<Result<{ snapshot: ProjectSnapshot; undo: FolderRenameUndo; linksUpdated: number }, ChangeProblem | 'blocked'>>
  /** Puts every name and link back, byte for byte; refused if a file changed since. */
  undoFolderRenames(snapshot: ProjectSnapshot, undo: FolderRenameUndo): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /** Writes the book's kinds of pages and what it calls a chapter to `project.md` (ADR 0011); nothing else changes. */
  setKinds(
    snapshot: ProjectSnapshot,
    kinds: readonly PageKind[],
    manuscriptUnit: ManuscriptUnit | null,
  ): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /**
   * Writes the book's title and author to `project.md` (Milestone 22, from the Export window), each only
   * when given; other keys, comments and the folder's name don't change.
   */
  setDetails(snapshot: ProjectSnapshot, details: { title?: string; author?: string }): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /** Writes which outline is main to `project.md` (ADR 0012); nothing else changes, no outline is touched. */
  setMainOutline(snapshot: ProjectSnapshot, file: ProjectPath): Promise<Result<ProjectSnapshot, ChangeProblem>>
  /** Writes which outlines are set aside, and which is main (`null`: not named), in one change to `project.md`. */
  setOutlineRoles(
    snapshot: ProjectSnapshot,
    roles: { setAside: readonly ProjectPath[]; mainOutline: ProjectPath | null },
  ): Promise<Result<ProjectSnapshot, ChangeProblem>>
  readChapter(root: string, file: ProjectPath): Promise<Result<ChapterText, 'missing' | 'unreadable'>>
  /** Saves the text, keeping the frontmatter as it is; refused if the file changed since `expected`. */
  saveChapter(
    root: string,
    file: ProjectPath,
    text: string,
    expected: Revision,
  ): Promise<Result<Revision, 'stale' | 'missing' | 'unreadable' | 'write-failed'>>
  /**
   * "Keep both": writes `text` as a new chapter next to `file`, named and titled with `label`, keeping the
   * chapter's other details but with a new id. Never overwrites; works even if `file` is gone.
   */
  saveChapterCopy(root: string, file: ProjectPath, text: string, label: string): Promise<Result<ProjectPath, 'write-failed'>>
}
