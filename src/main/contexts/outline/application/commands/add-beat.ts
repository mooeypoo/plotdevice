import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import { addBeat } from '../../domain/add-beat'
import type { OutlineSettings } from '../../domain/outline-settings'
import type { OutlineRepository } from '../../domain/ports/outline-repository'
import type { OutlineItemRef, OutlinePlacement } from '../../domain/splice-lines'
import { rewriteOutline, type OutlineEditCommandError } from './rewrite-outline'

/** Adds a one-line beat to a column, before one of its beats or at its end (ADR 0020). */
export type AddBeat = (
  path: ProjectPath,
  version: string,
  column: OutlineItemRef,
  title: string,
  placement: OutlinePlacement
) => Promise<Result<{ readonly version: string }, OutlineEditCommandError>>

/** Builds the `AddBeat` command. */
export function createAddBeat(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): AddBeat {
  return (path, version, column, title, placement) =>
    rewriteOutline(ports, path, version, (body) => addBeat(body, column, title, placement))
}
