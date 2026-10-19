import type {
  ApiResult,
  EntryTextDto,
  FolderChoiceDto,
  ManuscriptDto,
  ProjectSummaryDto,
  RecentProjectDto,
  SavedEntryDto
} from './dtos'

/** Opening, initializing, and remembering projects. */
export interface WorkspaceApi {
  /** Shows the native folder dialog. `null` when the writer cancels. */
  chooseFolder(): Promise<FolderChoiceDto | null>
  /** Opens a project. Only folders from `chooseFolder` or the recents list are accepted. */
  openProject(root: string): Promise<ApiResult<ProjectSummaryDto>>
  /** Writes novel.md into a folder from `chooseFolder`, then opens it. */
  initializeProject(root: string, title: string): Promise<ApiResult<ProjectSummaryDto>>
  /** Closes the open project. */
  closeProject(): Promise<void>
  listRecentProjects(): Promise<readonly RecentProjectDto[]>
  /** Forgets a recent project. The folder is not touched. */
  removeRecentProject(root: string): Promise<void>
}

/** The open project's parts and chapters. */
export interface ManuscriptApi {
  getManuscript(): Promise<ApiResult<ManuscriptDto>>
  /** Only paths from the last `getManuscript` are accepted. */
  openEntry(path: string): Promise<ApiResult<EntryTextDto>>
  /**
   * Saves the body only. Fails with `changed-on-disk` if the file changed since `version`, unless
   * `overwrite` is true.
   */
  saveEntryText(
    path: string,
    text: string,
    version: string,
    overwrite: boolean
  ): Promise<ApiResult<SavedEntryDto>>
}

/** The window's lifecycle. */
export interface AppApi {
  /** Called when the window is about to close; save, then call `readyToClose`. */
  onBeforeClose(listener: () => void): () => void
  readyToClose(): void
  /** Keeps the window open, for example when unsaved text couldn't be saved. */
  cancelClose(): void
}

/**
 * The whole renderer↔main surface, exposed to the renderer as `window.plotDevice`.
 */
export interface PlotDeviceApi {
  /** Incremented whenever this interface changes incompatibly. */
  readonly contractVersion: 3
  readonly workspace: WorkspaceApi
  readonly manuscript: ManuscriptApi
  readonly app: AppApi
}
