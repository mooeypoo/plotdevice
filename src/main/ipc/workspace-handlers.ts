import { z } from 'zod'
import type {
  ApiResult,
  FolderChoiceDto,
  ProjectSummaryDto,
  RecentProjectDto
} from '../../contract/dtos'
import type { InitializeProject } from '../contexts/workspace/application/commands/initialize-project'
import type {
  OpenProject,
  ReadProject
} from '../contexts/workspace/application/commands/open-project'
import type { RemoveRecentProject } from '../contexts/workspace/application/commands/remove-recent-project'
import type { InspectFolder } from '../contexts/workspace/application/queries/inspect-folder'
import type { ListRecentProjects } from '../contexts/workspace/application/queries/list-recent-projects'
import { toApiError, toProjectSummaryDto } from './workspace-dtos'

type ProjectRoot = Parameters<OpenProject>[0]
type OpenedProject = Extract<Awaited<ReturnType<OpenProject>>, { ok: true }>['value']

/** What the workspace handlers need, injected by the composition root. */
export interface WorkspaceHandlerDependencies {
  readonly inspectFolder: InspectFolder
  readonly openProject: OpenProject
  readonly readProject: ReadProject
  readonly initializeProject: InitializeProject
  readonly listRecentProjects: ListRecentProjects
  readonly removeRecentProject: RemoveRecentProject
  /** Normalizes an OS path from the renderer or a dialog. */
  readonly toProjectRoot: (osPath: string) => ProjectRoot
  /** A key under which two paths to the same folder are equal (case-insensitive on Windows). */
  readonly rootKey: (root: ProjectRoot) => string
  /** Called when a project opens (or is initialized), so per-project use cases can be built. */
  readonly onProjectOpened: (root: ProjectRoot, project: OpenedProject['project']) => void
  readonly onProjectClosed: () => void
}

/** The workspace API as plain functions of untrusted arguments. Electron wiring is separate. */
export interface WorkspaceHandlers {
  chooseFolder(showFolderDialog: () => Promise<string | undefined>): Promise<FolderChoiceDto | null>
  openProject(args: readonly unknown[]): Promise<ApiResult<ProjectSummaryDto>>
  initializeProject(args: readonly unknown[]): Promise<ApiResult<ProjectSummaryDto>>
  closeProject(): Promise<void>
  /** Re-reads the open project after files changed outside the app. */
  refreshProject(): Promise<ApiResult<ProjectSummaryDto>>
  listRecentProjects(): Promise<readonly RecentProjectDto[]>
  removeRecentProject(args: readonly unknown[]): Promise<void>
}

const MAX_PATH_LENGTH = 4096
const MAX_TITLE_LENGTH = 500

const rootArgs = z.tuple([z.string().min(1).max(MAX_PATH_LENGTH)])
const initializeArgs = z.tuple([
  z.string().min(1).max(MAX_PATH_LENGTH),
  z.string().max(MAX_TITLE_LENGTH)
])

const invalidRequest: ApiResult<never> = {
  ok: false,
  error: { code: 'invalid-request', message: 'The request was not understood.' }
}
const notAllowed: ApiResult<never> = {
  ok: false,
  error: { code: 'folder-not-allowed', message: 'Choose this folder with "Open folder…" first.' }
}

/**
 * Builds the handlers. The main process only opens folders the writer chose in the native dialog
 * or that are in the recents list, so the renderer can't make it read an arbitrary path.
 */
export function createWorkspaceHandlers(deps: WorkspaceHandlerDependencies): WorkspaceHandlers {
  const allowedRoots = new Set<string>()
  const allow = (root: ProjectRoot): void => {
    allowedRoots.add(deps.rootKey(root))
  }
  const isAllowed = (root: ProjectRoot): boolean => allowedRoots.has(deps.rootKey(root))
  let openRoot: ProjectRoot | undefined
  const opened = (root: ProjectRoot, project: OpenedProject['project']): void => {
    openRoot = root
    deps.onProjectOpened(root, project)
  }

  return {
    async chooseFolder(showFolderDialog) {
      const chosen = await showFolderDialog()
      if (chosen === undefined) return null

      const inspection = await deps.inspectFolder(deps.toProjectRoot(chosen))
      allow(inspection.root)
      if (inspection.projectAbove !== undefined) allow(inspection.projectAbove.root)
      return {
        root: inspection.root,
        name: inspection.name,
        isProject: inspection.isProject,
        ...(inspection.projectAbove !== undefined
          ? {
              projectAbove: {
                root: inspection.projectAbove.root,
                title: inspection.projectAbove.title
              }
            }
          : {}),
        ...(inspection.projectBelow !== undefined ? { projectBelow: inspection.projectBelow } : {})
      }
    },

    async openProject(args) {
      const parsed = rootArgs.safeParse(args)
      if (!parsed.success) return invalidRequest
      const root = deps.toProjectRoot(parsed.data[0])
      if (!isAllowed(root)) return notAllowed

      const result = await deps.openProject(root)
      if (!result.ok) {
        if (result.error.code === 'not-a-project' && result.error.projectAbove !== undefined) {
          allow(result.error.projectAbove)
        }
        return { ok: false, error: toApiError(result.error) }
      }
      opened(root, result.value.project)
      return { ok: true, value: toProjectSummaryDto(result.value) }
    },

    async initializeProject(args) {
      const parsed = initializeArgs.safeParse(args)
      if (!parsed.success) return invalidRequest
      const root = deps.toProjectRoot(parsed.data[0])
      if (!isAllowed(root)) return notAllowed

      const result = await deps.initializeProject(root, parsed.data[1])
      if (!result.ok) {
        if ('projectAbove' in result.error && result.error.projectAbove !== undefined) {
          allow(result.error.projectAbove)
        }
        return { ok: false, error: toApiError(result.error) }
      }
      opened(root, result.value.project)
      return { ok: true, value: toProjectSummaryDto(result.value) }
    },

    closeProject() {
      openRoot = undefined
      deps.onProjectClosed()
      return Promise.resolve()
    },

    async refreshProject() {
      if (openRoot === undefined) {
        return { ok: false, error: { code: 'no-project', message: 'No project is open.' } }
      }
      const result = await deps.readProject(openRoot)
      return result.ok
        ? { ok: true, value: toProjectSummaryDto(result.value) }
        : { ok: false, error: toApiError(result.error) }
    },

    async listRecentProjects() {
      const recents = await deps.listRecentProjects()
      for (const entry of recents) allow(entry.root)
      return recents.map(({ root, title, lastOpenedAt, available }) => ({
        root,
        title,
        lastOpenedAt,
        available
      }))
    },

    async removeRecentProject(args) {
      const parsed = rootArgs.safeParse(args)
      if (!parsed.success) return
      await deps.removeRecentProject(deps.toProjectRoot(parsed.data[0]))
    }
  }
}
