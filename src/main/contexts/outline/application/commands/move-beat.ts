import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import { moveBeat } from '../../domain/move-beat'
import type { OutlineSettings } from '../../domain/outline-settings'
import type { OutlineRepository } from '../../domain/ports/outline-repository'
import type { OutlineItemRef, OutlinePlacement } from '../../domain/splice-lines'
import { rewriteOutline, type OutlineEditCommandError } from './rewrite-outline'

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
) => Promise<Result<{ readonly version: string }, OutlineEditCommandError>>

/** Builds the `MoveBeat` command. */
export function createMoveBeat(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): MoveBeat {
  return (path, version, beat, column, placement) =>
    rewriteOutline(ports, path, version, (body) => moveBeat(body, beat, column, placement))
}
