import { nameComparisonKey } from './name-comparison-key'
import type { ProjectPath } from './project-path'

/** Whether `path` is inside `folder` (at any depth), compared as names are (case-folded, NFC). */
export function isInFolder(path: ProjectPath, folder: ProjectPath | undefined): boolean {
  return folder !== undefined && nameComparisonKey(path).startsWith(`${nameComparisonKey(folder)}/`)
}
