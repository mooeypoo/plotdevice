import type { ProjectPath } from '../../../shared-kernel/project-path'

/** A markdown file with no `type`, or one the app doesn't know (kept as `rawType`). */
export interface UntypedFile {
  readonly path: ProjectPath
  readonly rawType?: string
}
