import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { captureBeat } from '../../domain/capture-beat'
import type { OutlineSettings } from '../../domain/outline-settings'
import type {
  OutlineRepository,
  ReadOutlineError,
  WriteOutlineTextError
} from '../../domain/ports/outline-repository'
import type { OutlineEditError } from '../../domain/splice-lines'

/**
 * Appends a beat to the outline's Inbox, adding the heading if it is missing (ADR 0020). With
 * `expectedVersion`, refuses an outline that changed since the editor read it.
 */
export type CaptureBeat = (
  path: ProjectPath,
  text: string,
  expectedVersion: string | undefined
) => Promise<
  Result<
    { readonly version: string },
    ReadOutlineError | WriteOutlineTextError | OutlineEditError | DomainError<'read-only'>
  >
>

/** Builds the `CaptureBeat` command. */
export function createCaptureBeat(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): CaptureBeat {
  return async (path, text, expectedVersion) => {
    if (ports.settings.readOnly) {
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    }
    const read = await ports.repository.readBody(path)
    if (!read.ok) return read
    if (expectedVersion !== undefined && expectedVersion !== read.value.version) {
      return err(
        domainError('changed-on-disk', `"${path}" changed outside Plot Device.`, {
          reason: 'file-changed',
          path
        })
      )
    }
    const planned = captureBeat(read.value.text, ports.settings.words().inbox, text)
    if (!planned.ok) return planned
    const written = await ports.repository.writeBody(path, planned.value, read.value.version)
    return written.ok ? ok({ version: written.value.version }) : written
  }
}
