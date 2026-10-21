import type { ProjectRoot } from '../project-root'
import type { SameRoot } from '../recent-projects'
import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { Result } from '../../../../shared-kernel/result'

/** Why folder existence or project nesting could not be determined safely. */
export type ProjectFoldersError = DomainError<'folder-inspection-failed' | 'folder-search-limit'>

/** Facts about folders on this machine that the workspace needs, without touching their files. */
export interface ProjectFolders {
  /** Missing/non-directory roots are ordinary false; access and I/O failures remain explicit. */
  exists(root: ProjectRoot): Promise<Result<boolean, ProjectFoldersError>>
  /** The folder's own name, used as the title when novel.md has none. */
  nameOf(root: ProjectRoot): string
  readonly isSameRoot: SameRoot
  /** The nearest folder above `root` that contains novel.md. Projects can't be nested. */
  findProjectAbove(root: ProjectRoot): Promise<Result<ProjectRoot | undefined, ProjectFoldersError>>
  /** A project below `root`, skipping dot-folders; fails if traversal cannot establish an answer. */
  findProjectBelow(root: ProjectRoot): Promise<Result<ProjectRoot | undefined, ProjectFoldersError>>
}
