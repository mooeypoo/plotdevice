import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import {
  joinProjectPath,
  projectPathStem,
  type ProjectPath
} from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { uniqueFileName } from '../../../../shared-kernel/unique-file-name'
import type { CodexSettings } from '../../domain/codex-settings'
import { newOutlineText, UNTITLED_OUTLINE } from '../../domain/outline-file'
import type { CodexRepository, CreateCodexFileError } from '../../domain/ports/codex-repository'

/** Creates an outline at the project root, named after its title and unique in the project. */
export type CreateOutline = (
  title: string
) => Promise<
  Result<{ readonly path: ProjectPath }, CreateCodexFileError | DomainError<'read-only'>>
>

/** Builds the `CreateOutline` command. */
export function createCreateOutline(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): CreateOutline {
  return async (title) => {
    if (ports.settings.readOnly) {
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    }
    const outlineTitle = title.trim() === '' ? UNTITLED_OUTLINE : title.trim()
    const files = await ports.repository.load()
    const taken = new Set(
      [...files.linkCandidates, ...files.untyped].map((file) =>
        nameComparisonKey(projectPathStem(file.path))
      )
    )
    const path = joinProjectPath(undefined, uniqueFileName(outlineTitle, 'outline', taken))
    const created = await ports.repository.createFile(path, newOutlineText(outlineTitle))
    return created.ok ? ok({ path }) : created
  }
}
