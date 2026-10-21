import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { buildLinkIndex } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, type Result } from '../../../../shared-kernel/result'
import { readCodexProperties } from '../../domain/codex-properties'
import type { CodexSettings } from '../../domain/codex-settings'
import type {
  CodexRepository,
  ReadCodexError,
  WriteCodexPropertiesError
} from '../../domain/ports/codex-repository'
import { relationshipFields, type RelationshipEdit } from '../../domain/relationships'
import { createGetCodexProperties, type CodexPropertiesView } from '../queries/get-codex-properties'

/**
 * Sets a character's relationships, changing only what differs in the file (ADR 0007). Refused
 * (`cannot-edit`) when the file writes them in a shape the app can't edit safely.
 */
export type UpdateRelationships = (
  path: ProjectPath,
  version: string,
  relationships: readonly RelationshipEdit[]
) => Promise<
  Result<
    CodexPropertiesView,
    WriteCodexPropertiesError | ReadCodexError | DomainError<'read-only' | 'not-a-character'>
  >
>

/** Builds the `UpdateRelationships` command. */
export function createUpdateRelationships(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): UpdateRelationships {
  const read = createGetCodexProperties(ports)
  return async (path, version, relationships) => {
    if (ports.settings.readOnly) {
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    }
    const file = await ports.repository.readEntryFile(path)
    if (!file.ok) return file
    if (file.value.kind !== 'character') {
      return err(
        domainError('not-a-character', 'Only characters have relationships.', {
          reason: 'not-a-character'
        })
      )
    }
    const current = readCodexProperties(path, 'character', file.value.frontmatter)
    const files = await ports.repository.load()
    const fields = relationshipFields(
      relationships,
      current.relationships,
      files.linkCandidates,
      buildLinkIndex(files.linkCandidates)
    )
    const written = await ports.repository.writeRelationships(path, fields, version)
    if (!written.ok) return written
    return read(path)
  }
}
