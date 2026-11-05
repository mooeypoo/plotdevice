import type { AboutView, AppInfo } from './app-info'
import type {
  BackUpNowResult,
  BackupStatusResult,
  CleanupRuleView,
  ListBackupsResult,
  PreviewBackupResult,
  RestoreCopyResult,
  RestoreReplaceResult,
} from './backups'
import type {
  HostEvent,
  LeftOffRequest,
  OpenChapterResult,
  ResolveConflictRequest,
  ResolveConflictResult,
  SaveChapterRequest,
} from './chapter'
import type { OutlineEditRequest, OutlineResult, OutlineSummaryView, Place, StarterId } from './outline'
import type { TimelineResult } from './timeline'
import type { Preferences, PreferencesPatch } from './preferences'
import type { UpdateCheckView, UpdateView } from './updates'
import type {
  CardLinksView,
  LinkedFromView,
  ReferenceKind,
  ReferencePageView,
  ReferenceResult,
  ReferenceSummaryView,
  RelationshipChangeRequest,
  RetagView,
} from './references'
import type { CopyVersionResult, VersionResult, VersionsView } from './versions'
import type {
  CompileResult,
  ContentsChangeRequest,
  CreateProjectResult,
  NewProjectRequest,
  OpenedProject,
  OpenProjectRequest,
  OpenProjectResult,
  ProjectChangeResult,
  DeleteOutlineResult,
  RecentProjectView,
  KindsChangeRequest,
  FolderRenamePlanResult,
  FolderRenamesRequest,
  RenameFoldersResult,
  UndoFolderRenamesResult,
} from './project'
import type { ProjectPath } from '@plotdevice/shared'

/** Everything the renderer may ask of the host. Exposed as `window.plotDevice` by the preload script. */
export interface PlotDeviceApi {
  getAppInfo(): Promise<AppInfo>
  /** The version, the licence and the open-source credits, for the About window. */
  getAbout(): Promise<AboutView>
  getPreferences(): Promise<Preferences>
  /** Applies the change, saves it, and returns the settings now in effect. */
  setPreferences(patch: PreferencesPatch): Promise<Preferences>

  getRecentProjects(): Promise<RecentProjectView[]>
  forgetRecentProject(root: string): Promise<RecentProjectView[]>
  /** The project already open (reopened at startup, or before the page reloaded), if any. */
  getOpenProject(): Promise<OpenedProject | null>
  /** `'choose'` asks the author for a folder; a recent project is opened by its folder. */
  openProject(request: OpenProjectRequest): Promise<OpenProjectResult>
  /** Opens the sample book to try, in `language`; a copy in the app's own data (Milestone 20). */
  openSample(language: 'en' | 'he'): Promise<OpenProjectResult>
  /** "Start the sample over": the open sample book back as it first was. */
  restartSample(): Promise<OpenProjectResult>
  /** Makes a new project from a template, in a folder the host offered (Milestone 19). */
  createProject(details: NewProjectRequest): Promise<CreateProjectResult>
  /** Where a new project goes unless the author chooses: beside the last one opened, or in Documents. */
  newProjectLocation(): Promise<string>
  /** Asks the author for a folder to keep a new project in; `null` when they cancel. */
  chooseNewProjectLocation(): Promise<string | null>

  changeContents(change: ContentsChangeRequest): Promise<ProjectChangeResult>
  /** Compiles the book into one Markdown file, asking the author where to save it. */
  compileBook(): Promise<CompileResult>
  renameChapter(file: ProjectPath, title: string): Promise<ProjectChangeResult>
  /** A change to the book's kinds of pages, or to what it calls a chapter (ADR 0011). */
  changeKinds(change: KindsChangeRequest): Promise<ProjectChangeResult>
  /** Makes an outline the book's main outline, whose sections name the timeline's columns (ADR 0012). */
  setMainOutline(file: ProjectPath): Promise<ProjectChangeResult>
  /** Sets an outline aside, off the timeline, or brings it back; the main outline moves on if it was set aside. */
  setOutlineAside(file: ProjectPath, aside: boolean): Promise<ProjectChangeResult>
  /**
   * Deletes one outline (never what it links to): to the Trash, or for good once the author agreed to
   * that after `no-trash`. The book's details come back, with the main outline moved on if needed.
   */
  deleteOutline(file: ProjectPath, how: 'trash' | 'for-good'): Promise<DeleteOutlineResult>
  /** Puts the last deleted outline back as it was, main and set-aside included, until the book closes. */
  undoDeleteOutline(): Promise<ProjectChangeResult>
  /** "Match folder names": what would change, then the change, and its undo until the book closes. */
  planFolderRenames(renames: FolderRenamesRequest): Promise<FolderRenamePlanResult>
  renameFolders(renames: FolderRenamesRequest): Promise<RenameFoldersResult>
  undoFolderRenames(): Promise<UndoFolderRenamesResult>
  /** Copies the whole book folder to a place the author chooses. */
  /** This book's backups: where, when last, and any problem (Milestone 20). */
  backupStatus(): Promise<BackupStatusResult>
  /** The folder picker for this book's backups, starting at the last folder chosen; `null` when cancelled. */
  chooseBackupFolder(): Promise<string | null>
  /** Turns backups on in a folder the host offered, or off with `null`. */
  setBackupFolder(folder: string | null): Promise<BackupStatusResult>
  setBackupCleanup(rule: CleanupRuleView): Promise<BackupStatusResult>
  /** A backup now, into this book's folder; asks for one first if there's none. */
  backUpNow(): Promise<BackUpNowResult>
  /** Shows this book's backup folder in the system's file manager. */
  openBackupFolder(): Promise<void>
  listBackups(): Promise<ListBackupsResult>
  previewBackup(file: string): Promise<PreviewBackupResult>
  restoreBackupAsCopy(file: string): Promise<RestoreCopyResult>
  restoreBackupReplace(file: string): Promise<RestoreReplaceResult>
  /** Before leaving a book: whether to offer backups (once per book, once it has some content). */
  shouldOfferBackups(): Promise<boolean>
  /** The author's answer to the offer: a folder the host offered, or `null` for "Not now". */
  answerBackupOffer(folder: string | null): Promise<void>
  renameChapterFile(file: ProjectPath, newName: string): Promise<ProjectChangeResult>

  openChapter(file: ProjectPath): Promise<OpenChapterResult>
  /** Queues the chapter's full text for saving; progress arrives as `save-status` events. */
  saveChapter(request: SaveChapterRequest): Promise<void>
  resolveConflict(request: ResolveConflictRequest): Promise<ResolveConflictResult>
  /** Remembers where the author is, to return there next time. */
  leftOff(request: LeftOffRequest): Promise<void>
  /** Answers a `flush` event once pending text has been sent with `saveChapter`. */
  flushed(): Promise<void>

  listOutlines(): Promise<OutlineSummaryView[]>
  /** Every outline as a storyline, the main one first, line-ups resolved (ADR 0012). */
  getTimeline(): Promise<TimelineResult>
  /** A new outline, about a page or from a starter outline (Milestone 19), or empty. */
  createOutline(title: string, about?: ProjectPath, starter?: StarterId): Promise<OutlineResult>
  openOutline(file: ProjectPath): Promise<OutlineResult>
  editOutline(file: ProjectPath, edit: OutlineEditRequest): Promise<OutlineResult>
  undoOutline(file: ProjectPath): Promise<OutlineResult>
  /** Remembers the workspace, outline and view, to return there next time. */
  rememberPlace(place: Place): Promise<void>

  listReferences(): Promise<ReferenceSummaryView[]>
  readReference(file: ProjectPath): Promise<ReferenceResult<ReferencePageView>>
  createReference(kind: ReferenceKind, title: string): Promise<ReferenceResult<ReferenceSummaryView>>
  renameReference(file: ProjectPath, title: string): Promise<ReferenceResult<ReferenceSummaryView>>
  /** Renames a page's file, fixing every link to it (as chapters do). */
  renameReferenceFile(file: ProjectPath, newName: string): Promise<ReferenceResult<ReferenceSummaryView>>
  /** The outline cards that link to a chapter, with what else they link to. */
  cardsAbout(chapter: ProjectPath): Promise<CardLinksView[]>
  /** Adds, changes or removes one relationship on a page (ADR 0009), and returns the page as it is now. */
  editRelationship(file: ProjectPath, change: RelationshipChangeRequest): Promise<ReferenceResult<ReferencePageView>>
  /** Sets a page's tags (Milestone 12), and returns the page as lists show it now. */
  setTags(file: ProjectPath, tags: string[]): Promise<ReferenceResult<ReferenceSummaryView>>
  /** Renames a tag on every page that has it (merging into `to` if it exists), or removes it when `to` is `null`. */
  retag(from: string, to: string | null): Promise<RetagView>
  /** The outline cards, pages and chapters that link to a page. */
  linkedFrom(file: ProjectPath): Promise<LinkedFromView>
  getShelf(): Promise<ProjectPath[]>
  setShelf(files: ProjectPath[]): Promise<void>
  /** The tags chosen on the shelf while writing, by part name (`''`: outside any part). */
  getShelfTags(): Promise<Record<string, string[]>>
  chooseShelfTags(part: string, tags: string[]): Promise<void>
  /** The tag problems already reported for this project, so the notice isn't repeated. */
  getReportedTagProblems(): Promise<string[]>
  reportTagProblems(keys: string[]): Promise<void>

  /** Earlier versions of a chapter, page or outline, from the backups. */
  listVersions(file: ProjectPath): Promise<VersionResult<VersionsView>>
  readVersion(file: ProjectPath, at: number): Promise<VersionResult<string>>
  /** Puts an earlier version back; what it replaces becomes a version itself. */
  restoreVersion(file: ProjectPath, at: number, revision: string): Promise<VersionResult<void>>
  /** Saves an earlier version as a new file next to it. */
  copyVersion(file: ProjectPath, at: number): Promise<CopyVersionResult>

  /** A newer version to mention, unless the author dismissed it or turned update checks off (Milestone 15). */
  getUpdate(): Promise<UpdateView | null>
  /** Asks now, whatever the setting: "Check for updates" in About. */
  checkForUpdates(): Promise<UpdateCheckView>
  /** Stops mentioning this version; a later one is mentioned again. */
  dismissUpdate(version: string): Promise<void>

  onEvent(listener: (event: HostEvent) => void): () => void
}
