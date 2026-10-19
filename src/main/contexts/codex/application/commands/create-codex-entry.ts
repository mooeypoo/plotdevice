import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import {
  joinProjectPath,
  projectPathStem,
  type ProjectPath
} from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { uniqueFileName } from '../../../../shared-kernel/unique-file-name'
import type { CodexKind } from '../../domain/codex-entry'
import type { CodexSettings } from '../../domain/codex-settings'
import { newCodexText, UNTITLED } from '../../domain/codex-templates'
import type { CodexRepository, CreateCodexFileError } from '../../domain/ports/codex-repository'

/**
 * Creates a character, location, or note in its folder (`settings.folders`), named after its
 * title and unique across the project, with the template's headings.
 */
export type CreateCodexEntry = (
  kind: CodexKind,
  title: string
) => Promise<
  Result<{ readonly path: ProjectPath }, CreateCodexFileError | DomainError<'read-only'>>
>

/** Builds the `CreateCodexEntry` command. */
export function createCreateCodexEntry(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): CreateCodexEntry {
  return async (kind, title) => {
    if (ports.settings.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    const entryTitle = title.trim() === '' ? UNTITLED[kind] : title.trim()
    const files = await ports.repository.load()
    const taken = new Set(
      [...files.linkCandidates, ...files.untyped].map((file) =>
        nameComparisonKey(projectPathStem(file.path))
      )
    )
    const path = joinProjectPath(
      ports.settings.folders[kind],
      uniqueFileName(entryTitle, kind, taken)
    )
    const created = await ports.repository.createFile(path, newCodexText(kind, entryTitle))
    return created.ok ? ok({ path }) : created
  }
}
