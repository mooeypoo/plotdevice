import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { ManuscriptSettings } from '../../domain/manuscript-settings'
import type {
  ManuscriptRepository,
  WritePropertiesError
} from '../../domain/ports/manuscript-repository'
import { readStatuses, withStatus } from '../../domain/statuses'

/** Adds a status to novel.md's `statuses` list (only that key changes) and returns the new list. */
export type AddStatus = (
  status: string
) => Promise<Result<readonly string[], WritePropertiesError | DomainError<'read-only'>>>

/** Builds the `AddStatus` command. */
export function createAddStatus(ports: {
  readonly repository: ManuscriptRepository
  readonly settings: ManuscriptSettings
}): AddStatus {
  return async (status) => {
    if (ports.settings.readOnly)
      return err(domainError('read-only', 'This project is open read-only.'))
    const statuses = readStatuses(await ports.repository.readNovelFrontmatter())
    const next = withStatus(statuses, status)
    if (next === undefined) return ok(statuses)
    const written = await ports.repository.writeNovelProperties([{ key: 'statuses', value: next }])
    return written.ok ? ok(next) : written
  }
}
