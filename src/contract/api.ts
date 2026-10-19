import type { ApiResult, FolderChoiceDto, ProjectSummaryDto, RecentProjectDto } from './dtos'

/** Opening, initializing, and remembering projects. */
export interface WorkspaceApi {
  /** Shows the native folder dialog. `null` when the writer cancels. */
  chooseFolder(): Promise<FolderChoiceDto | null>
  /** Opens a project. Only folders from `chooseFolder` or the recents list are accepted. */
  openProject(root: string): Promise<ApiResult<ProjectSummaryDto>>
  /** Writes novel.md into a folder from `chooseFolder`, then opens it. */
  initializeProject(root: string, title: string): Promise<ApiResult<ProjectSummaryDto>>
  listRecentProjects(): Promise<readonly RecentProjectDto[]>
  /** Forgets a recent project. The folder is not touched. */
  removeRecentProject(root: string): Promise<void>
}

/**
 * The whole renderer↔main surface, exposed to the renderer as `window.plotDevice`.
 */
export interface PlotDeviceApi {
  /** Incremented whenever this interface changes incompatibly. */
  readonly contractVersion: 2
  readonly workspace: WorkspaceApi
}
