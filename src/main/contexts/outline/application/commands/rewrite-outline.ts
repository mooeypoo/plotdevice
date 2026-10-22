import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { OutlineSettings } from '../../domain/outline-settings'
import type {
  OutlineRepository,
  ReadOutlineError,
  WriteOutlineTextError
} from '../../domain/ports/outline-repository'
import type { OutlineEditError } from '../../domain/splice-lines'

/** Why a board command was refused. The outline is unchanged. */
export type OutlineEditCommandError =
  ReadOutlineError | WriteOutlineTextError | OutlineEditError | DomainError<'read-only'>

/**
 * Reads the exact body, checks the version, plans the edit and writes it with the same version, so
 * a change in between is refused (ADR 0020). Shared by the board's commands.
 */
export async function rewriteOutline(
  ports: { readonly repository: OutlineRepository; readonly settings: OutlineSettings },
  path: ProjectPath,
  version: string,
  plan: (body: string) => Result<string, OutlineEditError>
): Promise<Result<{ readonly version: string }, OutlineEditCommandError>> {
  if (ports.settings.readOnly) {
    return err(domainError('read-only', 'This project is open read-only.', { reason: 'read-only' }))
  }
  const read = await ports.repository.readBody(path)
  if (!read.ok) return read
  if (read.value.version !== version) {
    return err(
      domainError('changed-on-disk', `"${path}" changed outside Plot Device.`, {
        reason: 'file-changed',
        path
      })
    )
  }
  const planned = plan(read.value.text)
  if (!planned.ok) return planned
  if (planned.value === read.value.text) return ok({ version })
  const written = await ports.repository.writeBody(path, planned.value, version)
  return written.ok ? ok({ version: written.value.version }) : written
}
