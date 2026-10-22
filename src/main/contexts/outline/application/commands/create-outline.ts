import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import {
  joinProjectPath,
  projectPathStem,
  type ProjectPath
} from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { uniqueFileName } from '../../../../shared-kernel/unique-file-name'
import type { OutlineSettings } from '../../domain/outline-settings'
import { newOutlineText } from '../../domain/outline-file'
import type {
  CreateOutlineFileError,
  OutlineRepository
} from '../../domain/ports/outline-repository'

/** Creates an outline at the project root, named after its title and unique in the project. */
export type CreateOutline = (
  title: string
) => Promise<
  Result<{ readonly path: ProjectPath }, CreateOutlineFileError | DomainError<'read-only'>>
>

/** Builds the `CreateOutline` command. */
export function createCreateOutline(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): CreateOutline {
  return async (title) => {
    if (ports.settings.readOnly) {
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    }
    const outlineTitle = title.trim() === '' ? ports.settings.words().untitledOutline : title.trim()
    const files = await ports.repository.load()
    const taken = new Set(files.taken.map((path) => nameComparisonKey(projectPathStem(path))))
    const path = joinProjectPath(undefined, uniqueFileName(outlineTitle, 'outline', taken))
    const created = await ports.repository.createFile(path, newOutlineText(outlineTitle))
    return created.ok ? ok({ path }) : created
  }
}
