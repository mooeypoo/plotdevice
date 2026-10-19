import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { ok, type Result } from '../../../../shared-kernel/result'
import { countWords } from '../../../../shared-kernel/word-count'
import type { CodexRepository, ReadCodexError } from '../../domain/ports/codex-repository'

/** A codex entry's body for the editor. */
export interface OpenedCodexEntry {
  readonly text: string
  readonly version: string
  readonly wordCount: number
}

/** Reads a codex entry's body. */
export type OpenCodexEntry = (
  path: ProjectPath
) => Promise<Result<OpenedCodexEntry, ReadCodexError>>

/** Builds the `OpenCodexEntry` query. */
export function createOpenCodexEntry(ports: {
  readonly repository: CodexRepository
}): OpenCodexEntry {
  return async (path) => {
    const read = await ports.repository.readText(path)
    return read.ok ? ok({ ...read.value, wordCount: countWords(read.value.text) }) : read
  }
}
