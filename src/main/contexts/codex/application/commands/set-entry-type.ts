import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { EntryType } from '../../../../shared-kernel/entry-type'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { CodexSettings } from '../../domain/codex-settings'
import type {
  CodexRepository,
  WriteCodexPropertiesError
} from '../../domain/ports/codex-repository'

/**
 * Gives an untyped file a `type`, writing that one key and nothing else. Only files the codex
 * lists as untyped can be typed this way.
 */
export type SetEntryType = (
  path: ProjectPath,
  type: Exclude<EntryType, 'scene'>
) => Promise<Result<void, WriteCodexPropertiesError | DomainError<'read-only' | 'not-untyped'>>>

/** Builds the `SetEntryType` command. */
export function createSetEntryType(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): SetEntryType {
  return async (path, type) => {
    if (ports.settings.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    const files = await ports.repository.load()
    if (!files.untyped.some((file) => file.path === path)) {
      return err(domainError('not-untyped', 'That file already has a type.'))
    }
    const written = await ports.repository.writeProperties(
      path,
      [{ key: 'type', value: type }],
      undefined
    )
    return written.ok ? ok(undefined) : written
  }
}
