import type { ManuscriptRepository } from '../../domain/ports/manuscript-repository'
import { readStatuses } from '../../domain/statuses'

/** The project's statuses, from novel.md. */
export type ListStatuses = () => Promise<readonly string[]>

/** Builds the `ListStatuses` query. */
export function createListStatuses(ports: {
  readonly repository: ManuscriptRepository
}): ListStatuses {
  return async () => readStatuses(await ports.repository.readNovelFrontmatter())
}
