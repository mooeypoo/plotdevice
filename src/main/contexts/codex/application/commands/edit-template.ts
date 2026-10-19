import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { CodexKind } from '../../domain/codex-entry'
import type { CodexSettings } from '../../domain/codex-settings'
import { defaultTemplateText } from '../../domain/codex-templates'
import type { CodexRepository, CreateCodexFileError } from '../../domain/ports/codex-repository'
import { templatePath } from '../template-path'

/**
 * The template file for a kind, ready to edit: writes the default template first when the
 * project has none, so the writer starts from what new entries get today.
 */
export type EditTemplate = (
  kind: CodexKind
) => Promise<
  Result<{ readonly path: ProjectPath }, CreateCodexFileError | DomainError<'read-only'>>
>

/** Builds the `EditTemplate` command. */
export function createEditTemplate(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): EditTemplate {
  return async (kind) => {
    const path = templatePath(ports.settings, kind)
    if (path === undefined)
      return err(domainError('write-failed', 'The template folder is unusable.'))
    if ((await ports.repository.readFileText(path)) !== undefined) return ok({ path })
    if (ports.settings.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    const created = await ports.repository.createFile(path, defaultTemplateText(kind))
    return created.ok || created.error.code === 'already-exists' ? ok({ path }) : created
  }
}
