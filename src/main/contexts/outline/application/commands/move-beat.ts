import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { moveBeat } from '../../domain/move-beat'
import type { OutlineSettings } from '../../domain/outline-settings'
import type {
  OutlineRepository,
  ReadOutlineError,
  WriteOutlineTextError
} from '../../domain/ports/outline-repository'
import type {
  OutlineEditError,
  OutlineItemRef,
  OutlinePlacement
} from '../../domain/splice-lines'

/** Why a board move was refused. The outline is unchanged. */
export type OutlineMoveError =
  | ReadOutlineError
  | WriteOutlineTextError
  | OutlineEditError
  | DomainError<'read-only'>

/**
 * Moves a beat, with its notes, into a column (ADR 0020). Refuses an outline that changed since
 * the board read it at `version`.
 */
export type MoveBeat = (
  path: ProjectPath,
  version: string,
  beat: OutlineItemRef,
  column: OutlineItemRef,
  placement: OutlinePlacement
) => Promise<Result<{ readonly version: string }, OutlineMoveError>>

/** Builds the `MoveBeat` command. */
export function createMoveBeat(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): MoveBeat {
  return async (path, version, beat, column, placement) =>
    rewriteOutline(ports, path, version, (body) => moveBeat(body, beat, column, placement))
}

/**
 * Reads the exact body, checks the version, plans the edit and writes it with the same version, so
 * a change in between is refused (ADR 0020). Shared by the board's commands.
 */
export async function rewriteOutline(
  ports: { readonly repository: OutlineRepository; readonly settings: OutlineSettings },
  path: ProjectPath,
  version: string,
  plan: (body: string) => Result<string, OutlineEditError>
): Promise<Result<{ readonly version: string }, OutlineMoveError>> {
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
