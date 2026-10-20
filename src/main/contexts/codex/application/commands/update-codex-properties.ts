import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, type Result } from '../../../../shared-kernel/result'
import { codexWrites, type CodexChanges } from '../../domain/codex-changes'
import type { CodexSettings } from '../../domain/codex-settings'
import type {
  CodexRepository,
  ReadCodexError,
  WriteCodexPropertiesError
} from '../../domain/ports/codex-repository'
import { createGetCodexProperties, type CodexPropertiesView } from '../queries/get-codex-properties'
import { isMapping } from '../../../../shared-kernel/frontmatter-values'
import { canEditCharacterGroups } from '../../domain/character-groups'

/** Changes a codex entry's properties, only the keys that changed, and returns them as now read. */
export type UpdateCodexProperties = (
  path: ProjectPath,
  version: string,
  changes: CodexChanges
) => Promise<
  Result<CodexPropertiesView, WriteCodexPropertiesError | ReadCodexError | DomainError<'read-only'>>
>

/** Builds the `UpdateCodexProperties` command. */
export function createUpdateCodexProperties(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): UpdateCodexProperties {
  const read = createGetCodexProperties(ports)
  return async (path, version, changes) => {
    if (ports.settings.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    if (changes.groups !== undefined) {
      const entry = await ports.repository.readEntryFile(path)
      if (!entry.ok) return entry
      const keys = isMapping(entry.value.frontmatter) ? entry.value.frontmatter : {}
      if (entry.value.kind !== 'character' || !canEditCharacterGroups(keys['groups'])) {
        return err(
          domainError(
            'cannot-edit',
            'Groups can only be changed on characters with a text or list-of-text groups field. The file was left unchanged.'
          )
        )
      }
    }
    const written = await ports.repository.writeProperties(path, codexWrites(changes), version)
    if (!written.ok) return written
    return read(path)
  }
}
