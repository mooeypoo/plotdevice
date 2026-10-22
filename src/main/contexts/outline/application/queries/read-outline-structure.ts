import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { ok, type Result } from '../../../../shared-kernel/result'
import type { OutlineSettings } from '../../domain/outline-settings'
import { readOutlineStructure, type OutlineStructure } from '../../domain/outline-structure'
import type { OutlineRepository, ReadOutlineError } from '../../domain/ports/outline-repository'

export type { OutlineBeat } from '../../domain/outline-structure'
export type { ReadOutlineError }

/** An outline's board structure, the version it was read at, and which column is the Inbox. */
export interface OutlineStructureReading {
  readonly version: string
  readonly structure: OutlineStructure
  /** The index of the first column titled with an accepted spelling of the Inbox word. */
  readonly inboxColumn: number | null
}

/** Reads an outline's board structure from its exact body (ADR 0020). */
export type ReadOutlineStructure = (
  path: ProjectPath
) => Promise<Result<OutlineStructureReading, ReadOutlineError>>

/** Builds the `ReadOutlineStructure` query. */
export function createReadOutlineStructure(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): ReadOutlineStructure {
  return async (path) => {
    const read = await ports.repository.readBody(path)
    if (!read.ok) return read
    const structure = readOutlineStructure(read.value.text)
    const accepted = new Set(ports.settings.words().inbox.recognize.map(nameComparisonKey))
    const inbox = structure.columns.findIndex((column) =>
      accepted.has(nameComparisonKey(column.title))
    )
    return ok({ version: read.value.version, structure, inboxColumn: inbox === -1 ? null : inbox })
  }
}
