export {
  createPreferencesSession,
  defaultPreferences,
  loadPreferences,
  parsePreferences,
  updatePreferences,
  type LoadedPreferences,
  type PreferencesSession,
} from './preferences/preferences'
export type { PreferencesStore, PreferencesWriteFailure } from './preferences/preferences-store'
export { createChapterAutosave, type ChapterAutosave, type SaveStatus, type WriteChapter } from './chapters/chapter-autosave'
export type { AppDataFile, AppDataWriteFailure } from './ports/app-data-file'
export type { BackupEntry, BackupStore } from './ports/backup-store'
export type { VersionRepository, Versions } from './ports/version-repository'
export {
  createRecentProjectsSession,
  MAX_RECENT_PROJECTS,
  parseRecentProjects,
  MAX_CHAPTER_POSITIONS,
  type ChapterPosition,
  type LeftOff,
  type Place,
  type RecentProject,
  type RecentProjects,
  type RecentProjectsSession,
} from './recent/recent-projects'
export {
  createWritingSession,
  type ConflictChoice,
  type ConflictResolved,
  type NoProject,
  type OpenedChapter,
  type ResolveProblem,
  type SessionEvent,
  type WritingSession,
  type WritingSessionOptions,
} from './session/writing-session'
export type { FileStore, ReadProblem, RenameProblem, Revision, StoredText, TextToStore, WriteProblem } from './ports/file-store'
export type { IdGenerator } from './ports/id-generator'
export type { OutlineDocument, OutlineRepository, OutlineSummary, OutlineWriteProblem } from './ports/outline-repository'
export type { CardLinks, ReferencePage, ReferenceRepository } from './ports/reference-repository'
export { cardsLinkingTo } from './references/references'
export {
  createOutlineSession,
  type OutlineEditFailure,
  type OutlineEvent,
  type OutlineSession,
  type OutlineSessionOptions,
  type OutlineState,
  type UndoFailure,
} from './outlines/outline-session'
export type { JournalEntry, JournalStep, JournalStore } from './ports/journal-store'
export type { CreateFolderProblem, ProjectFolders } from './ports/project-folders'
export type {
  ChangeProblem,
  ChapterFile,
  ChapterText,
  ContentsChange,
  CreateProblem,
  FileRenamed,
  OpenProblem,
  ProjectRepository,
  ProjectSnapshot,
  ProjectWarning,
  RecoveryOutcome,
  RenameFileProblem,
} from './ports/project-repository'
