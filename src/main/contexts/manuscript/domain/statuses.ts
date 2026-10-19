import { isMapping } from './frontmatter-values'

/** The statuses a project starts with (see "`novel.md`" in docs/file-format.md). */
export const DEFAULT_STATUSES: readonly string[] = ['idea', 'outline', 'draft', 'revised', 'final']

/** The project's statuses from novel.md: an open list, like tags. */
export function readStatuses(novelFrontmatter: unknown): readonly string[] {
  const raw = isMapping(novelFrontmatter) ? novelFrontmatter['statuses'] : undefined
  if (!Array.isArray(raw)) return DEFAULT_STATUSES
  const statuses = raw.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  )
  return statuses.length > 0 ? statuses : DEFAULT_STATUSES
}

/** The list with `status` added at the end, or `undefined` if it's already there. */
export function withStatus(
  statuses: readonly string[],
  status: string
): readonly string[] | undefined {
  const trimmed = status.trim()
  if (
    trimmed === '' ||
    statuses.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())
  ) {
    return undefined
  }
  return [...statuses, trimmed]
}
