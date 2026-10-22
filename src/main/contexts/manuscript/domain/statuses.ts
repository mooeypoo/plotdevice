import { isMapping } from '../../../shared-kernel/frontmatter-values'

/**
 * The project's statuses from novel.md: an open list, like tags. Without one, the statuses for the
 * book's language (`fallback`), as a new novel.md would list them.
 */
export function readStatuses(
  novelFrontmatter: unknown,
  fallback: readonly string[]
): readonly string[] {
  const raw = isMapping(novelFrontmatter) ? novelFrontmatter['statuses'] : undefined
  if (!Array.isArray(raw)) return fallback
  const statuses = raw.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  )
  return statuses.length > 0 ? statuses : fallback
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
