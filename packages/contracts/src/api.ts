import type { AboutView, AppInfo } from './app-info'
import type {
  HostEvent,
  LeftOffRequest,
  OpenChapterResult,
  ResolveConflictRequest,
  ResolveConflictResult,
  SaveChapterRequest,
} from './chapter'
import type { OutlineEditRequest, OutlineResult, OutlineSummaryView, Place } from './outline'
import type { Preferences, PreferencesPatch } from './preferences'
import type {
  CardLinksView,
  LinkedFromView,
  ReferenceKind,
  ReferencePageView,
  ReferenceResult,
  ReferenceSummaryView,
  RelationshipChangeRequest,
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
  RecentProjectView,
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
  /** Asks the author where to put the new project's folder. */
  createProject(details: NewProjectRequest): Promise<CreateProjectResult>

  changeContents(change: ContentsChangeRequest): Promise<ProjectChangeResult>
  /** Compiles the book into one Markdown file, asking the author where to save it. */
  compileBook(): Promise<CompileResult>
  renameChapter(file: ProjectPath, title: string): Promise<ProjectChangeResult>
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
  createOutline(title: string, about?: ProjectPath): Promise<OutlineResult>
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
  /** The outline cards, pages and chapters that link to a page. */
  linkedFrom(file: ProjectPath): Promise<LinkedFromView>
  getShelf(): Promise<ProjectPath[]>
  setShelf(files: ProjectPath[]): Promise<void>

  /** Earlier versions of a chapter, page or outline, from the backups. */
  listVersions(file: ProjectPath): Promise<VersionResult<VersionsView>>
  readVersion(file: ProjectPath, at: number): Promise<VersionResult<string>>
  /** Puts an earlier version back; what it replaces becomes a version itself. */
  restoreVersion(file: ProjectPath, at: number, revision: string): Promise<VersionResult<void>>
  /** Saves an earlier version as a new file next to it. */
  copyVersion(file: ProjectPath, at: number): Promise<CopyVersionResult>

  onEvent(listener: (event: HostEvent) => void): () => void
}
