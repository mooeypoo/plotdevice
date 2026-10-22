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
import { newCodexText } from '../../domain/codex-templates'
import type { CodexRepository, CreateCodexFileError } from '../../domain/ports/codex-repository'
import { templatePath } from '../template-path'

/**
 * Creates a character, location, or note in its folder (`settings.folders`), named after its
 * title and unique across the project, starting from the project's template for its kind (or the
 * default).
 */
export type CreateCodexEntry = (
  kind: CodexKind,
  title: string
) => Promise<
  Result<{ readonly path: ProjectPath }, CreateCodexFileError | DomainError<'read-only'>>
>

/** The project's template for `kind`, or `undefined` to use the default. */
async function readTemplate(
  ports: { readonly repository: CodexRepository; readonly settings: CodexSettings },
  kind: CodexKind
): Promise<string | undefined> {
  const path = templatePath(ports.settings, kind)
  return path === undefined ? undefined : ports.repository.readFileText(path)
}

/** Builds the `CreateCodexEntry` command. */
export function createCreateCodexEntry(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): CreateCodexEntry {
  return async (kind, title) => {
    if (ports.settings.readOnly) {
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    }
    const entryTitle = title.trim() === '' ? ports.settings.words().untitled[kind] : title.trim()
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
    const template = await readTemplate(ports, kind)
    const created = await ports.repository.createFile(
      path,
      newCodexText(kind, entryTitle, template, ports.settings.words().headings[kind])
    )
    return created.ok ? ok({ path }) : created
  }
}
