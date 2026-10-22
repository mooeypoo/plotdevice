import type { ProjectPath } from '../../../shared-kernel/project-path'

/** The writer's outline (`type: outline`): a free-form plan, read beside the draft. */
export interface OutlineFile {
  readonly path: ProjectPath
  /** The `title` key, or the file name without `.md`. */
  readonly title: string
}

/** The text of a new outline: only `type` and `title`, and an empty page to write on. */
export function newOutlineText(title: string): string {
  return ['---', 'type: outline', `title: ${JSON.stringify(title)}`, '---', ''].join('\n')
}
