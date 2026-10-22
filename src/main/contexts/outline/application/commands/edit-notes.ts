import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import { editNotes } from '../../domain/edit-notes'
import type { OutlineSettings } from '../../domain/outline-settings'
import type { OutlineRepository } from '../../domain/ports/outline-repository'
import type { OutlineItemRef } from '../../domain/splice-lines'
import { rewriteOutline, type OutlineEditCommandError } from './rewrite-outline'

/** Replaces a beat's notes; empty notes remove them (ADR 0020). */
export type EditNotes = (
  path: ProjectPath,
  version: string,
  beat: OutlineItemRef,
  notes: string
) => Promise<Result<{ readonly version: string }, OutlineEditCommandError>>

/** Builds the `EditNotes` command. */
export function createEditNotes(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): EditNotes {
  return (path, version, beat, notes) =>
    rewriteOutline(ports, path, version, (body) => editNotes(body, beat, notes))
}
