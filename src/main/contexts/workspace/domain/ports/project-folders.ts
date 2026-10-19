import type { ProjectRoot } from '../project-root'
import type { SameRoot } from '../recent-projects'

/** Facts about folders on this machine that the workspace needs, without touching their files. */
export interface ProjectFolders {
  exists(root: ProjectRoot): Promise<boolean>
  /** The folder's own name, used as the title when novel.md has none. */
  nameOf(root: ProjectRoot): string
  readonly isSameRoot: SameRoot
  /** The nearest folder above `root` that contains novel.md. Projects can't be nested. */
  findProjectAbove(root: ProjectRoot): Promise<ProjectRoot | undefined>
  /** A folder below `root` that contains novel.md, if any (skipping dot-folders). */
  findProjectBelow(root: ProjectRoot): Promise<ProjectRoot | undefined>
}
