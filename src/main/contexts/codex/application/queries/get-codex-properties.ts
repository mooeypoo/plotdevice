import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { ok, type Result } from '../../../../shared-kernel/result'
import { readCodexProperties, type CodexProperties } from '../../domain/codex-properties'
import type { CodexRepository, ReadCodexError } from '../../domain/ports/codex-repository'

/** A codex entry's properties, with the file version they came from. */
export interface CodexPropertiesView {
  readonly properties: CodexProperties
  readonly version: string
}

/** Reads a codex entry's properties for the inspector. */
export type GetCodexProperties = (
  path: ProjectPath
) => Promise<Result<CodexPropertiesView, ReadCodexError>>

/** Builds the `GetCodexProperties` query. */
export function createGetCodexProperties(ports: {
  readonly repository: CodexRepository
}): GetCodexProperties {
  return async (path) => {
    const read = await ports.repository.readEntryFile(path)
    if (!read.ok) return read
    const { kind, frontmatter, version } = read.value
    return ok({ properties: readCodexProperties(path, kind, frontmatter), version })
  }
}
