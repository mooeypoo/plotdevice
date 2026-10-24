import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import { addColumn } from '../../domain/add-column'
import type { OutlineSettings } from '../../domain/outline-settings'
import type { OutlineRepository } from '../../domain/ports/outline-repository'
import type { OutlinePlacement } from '../../domain/splice-lines'
import { rewriteOutline, type OutlineEditCommandError } from './rewrite-outline'

/** Adds a `##` column to an outline, before another column or at its end (D5, ADR 0020). */
export type AddColumn = (
  path: ProjectPath,
  version: string,
  title: string,
  placement: OutlinePlacement
) => Promise<Result<{ readonly version: string }, OutlineEditCommandError>>

/** Builds the `AddColumn` command. */
export function createAddColumn(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): AddColumn {
  return (path, version, title, placement) =>
    rewriteOutline(ports, path, version, (body) => addColumn(body, title, placement))
}
