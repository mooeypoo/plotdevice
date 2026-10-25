import type { AppInfo } from './app-info'
import type { HostEvent, LeftOffRequest, OpenChapterResult, ResolveConflictRequest, ResolveConflictResult, SaveChapterRequest } from './chapter'
import type { OutlineEditRequest, OutlineResult, OutlineSummaryView, Place } from './outline'
import type { Preferences, PreferencesPatch } from './preferences'
import type {
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
  createOutline(title: string): Promise<OutlineResult>
  openOutline(file: ProjectPath): Promise<OutlineResult>
  editOutline(file: ProjectPath, edit: OutlineEditRequest): Promise<OutlineResult>
  undoOutline(file: ProjectPath): Promise<OutlineResult>
  /** Remembers the workspace, outline and view, to return there next time. */
  rememberPlace(place: Place): Promise<void>

  onEvent(listener: (event: HostEvent) => void): () => void
}
