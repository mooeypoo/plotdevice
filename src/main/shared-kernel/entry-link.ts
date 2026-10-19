import type { LinkCandidate } from './link-index'
import { nameComparisonKey } from './name-comparison-key'
import { projectPathStem, type ProjectPath } from './project-path'

/** The link the app writes to `path`, in NFC: by file name, or by path when another file shares the name. */
export function linkTo(path: ProjectPath, candidates: readonly LinkCandidate[]): string {
  const stem = projectPathStem(path)
  const sameName = candidates.filter(
    (candidate) => nameComparisonKey(projectPathStem(candidate.path)) === nameComparisonKey(stem)
  )
  // Written in NFC like every new name (see "Unicode normalization"); it matches either way.
  const link = sameName.length > 1 ? path.replace(/\.md$/iu, '') : stem
  return `[[${link.normalize('NFC')}]]`
}
