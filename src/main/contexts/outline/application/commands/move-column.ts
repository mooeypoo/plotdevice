import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import { moveColumn } from '../../domain/move-column'
import type { OutlineSettings } from '../../domain/outline-settings'
import type { OutlineRepository } from '../../domain/ports/outline-repository'
import type { OutlineItemRef, OutlinePlacement } from '../../domain/splice-lines'
import { rewriteOutline, type OutlineEditCommandError } from './rewrite-outline'

/** Moves a column, heading to the next `##`, before another column or to the end (ADR 0020). */
export type MoveColumn = (
  path: ProjectPath,
  version: string,
  column: OutlineItemRef,
  placement: OutlinePlacement
) => Promise<Result<{ readonly version: string }, OutlineEditCommandError>>

/** Builds the `MoveColumn` command. */
export function createMoveColumn(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): MoveColumn {
  return (path, version, column, placement) =>
    rewriteOutline(ports, path, version, (body) => moveColumn(body, column, placement))
}
