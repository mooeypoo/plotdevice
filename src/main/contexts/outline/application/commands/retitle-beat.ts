import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { Result } from '../../../../shared-kernel/result'
import type { OutlineSettings } from '../../domain/outline-settings'
import type { OutlineRepository } from '../../domain/ports/outline-repository'
import { retitleBeat } from '../../domain/retitle-beat'
import type { OutlineItemRef } from '../../domain/splice-lines'
import { rewriteOutline, type OutlineEditCommandError } from './rewrite-outline'

/** Replaces a beat's title, keeping its marker, notes and line break (ADR 0020). */
export type RetitleBeat = (
  path: ProjectPath,
  version: string,
  beat: OutlineItemRef,
  title: string
) => Promise<Result<{ readonly version: string }, OutlineEditCommandError>>

/** Builds the `RetitleBeat` command. */
export function createRetitleBeat(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): RetitleBeat {
  return (path, version, beat, title) =>
    rewriteOutline(ports, path, version, (body) => retitleBeat(body, beat, title))
}
