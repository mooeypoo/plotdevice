import type { LinkCandidate } from '../../../shared-kernel/link-index'
import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'
import { projectPathStem, type ProjectPath } from '../../../shared-kernel/project-path'

/** The link the app writes to `path`: by file name, or by path when another file shares the name. */
export function linkTo(path: ProjectPath, candidates: readonly LinkCandidate[]): string {
  const stem = projectPathStem(path)
  const sameName = candidates.filter(
    (candidate) => nameComparisonKey(projectPathStem(candidate.path)) === nameComparisonKey(stem)
  )
  return sameName.length > 1 ? `[[${path.replace(/\.md$/iu, '')}]]` : `[[${stem}]]`
}
