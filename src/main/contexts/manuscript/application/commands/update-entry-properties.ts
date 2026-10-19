import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { readEntryProperties } from '../../domain/entry-properties'
import type { ManuscriptSettings } from '../../domain/manuscript-settings'
import type {
  ManuscriptRepository,
  ReadEntryTextError,
  WritePropertiesError
} from '../../domain/ports/manuscript-repository'
import { propertyWrites, type PropertyChanges } from '../../domain/property-changes'
import type { EntryPropertiesView } from '../queries/get-entry-properties'

/** Why properties weren't saved. The file is untouched. */
export type UpdateEntryPropertiesError =
  ReadEntryTextError | WritePropertiesError | DomainError<'read-only'>

/**
 * Saves inspector changes to a part's or chapter's frontmatter, changing only those keys. Refuses
 * when the file changed since `version` was read.
 */
export type UpdateEntryProperties = (
  path: ProjectPath,
  version: string,
  changes: PropertyChanges
) => Promise<Result<EntryPropertiesView, UpdateEntryPropertiesError>>

/** Builds the `UpdateEntryProperties` command. */
export function createUpdateEntryProperties(ports: {
  readonly repository: ManuscriptRepository
  readonly settings: ManuscriptSettings
}): UpdateEntryProperties {
  return async (path, version, changes) => {
    if (ports.settings.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    const current = await ports.repository.readEntryFile(path)
    if (!current.ok) return current
    if (current.value.version !== version) {
      return err(domainError('changed-on-disk', 'This file changed outside Plot Device.'))
    }

    const properties = readEntryProperties(path, current.value.kind, current.value.frontmatter)
    const writes = propertyWrites(properties, changes)
    if (writes.length === 0) return ok({ properties, version })

    const written = await ports.repository.writeProperties(path, writes, version)
    if (!written.ok) return written
    const after = await ports.repository.readEntryFile(path)
    if (!after.ok) return after
    return ok({
      properties: readEntryProperties(path, after.value.kind, after.value.frontmatter),
      version: after.value.version
    })
  }
}
