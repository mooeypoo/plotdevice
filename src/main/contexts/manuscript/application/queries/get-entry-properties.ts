import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import { readEntryProperties, type EntryProperties } from '../../domain/entry-properties'
import type {
  ManuscriptRepository,
  ReadEntryTextError
} from '../../domain/ports/manuscript-repository'

/** A part's or chapter's properties for the inspector, with the file version they came from. */
export interface EntryPropertiesView {
  readonly properties: EntryProperties
  readonly version: string
}

/** Reads a part's or chapter's properties. */
export type GetEntryProperties = (
  path: ProjectPath
) => Promise<Result<EntryPropertiesView, ReadEntryTextError>>

/** Builds the `GetEntryProperties` query. */
export function createGetEntryProperties(ports: {
  readonly repository: ManuscriptRepository
}): GetEntryProperties {
  return async (path) => {
    const read = await ports.repository.readEntryFile(path)
    if (!read.ok) return read
    const { kind, frontmatter, version } = read.value
    return {
      ok: true,
      value: { properties: readEntryProperties(path, kind, frontmatter), version }
    }
  }
}
