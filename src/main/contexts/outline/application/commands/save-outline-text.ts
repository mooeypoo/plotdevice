import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { countWords } from '../../../../shared-kernel/word-count'
import type {
  OutlineRepository,
  WriteOutlineTextError
} from '../../domain/ports/outline-repository'

/** Saves an outline's body only. Unless `overwrite` is set, a file changed since `version` is refused. */
export type SaveOutlineText = (
  path: ProjectPath,
  text: string,
  version: string,
  overwrite: boolean
) => Promise<
  Result<
    { readonly version: string; readonly wordCount: number },
    WriteOutlineTextError | DomainError<'read-only'>
  >
>

/** Builds the `SaveOutlineText` command. */
export function createSaveOutlineText(ports: {
  readonly repository: OutlineRepository
  readonly readOnly: boolean
}): SaveOutlineText {
  return async (path, text, version, overwrite) => {
    if (ports.readOnly)
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    const written = await ports.repository.writeText(path, text, overwrite ? undefined : version)
    return written.ok
      ? ok({ version: written.value.version, wordCount: countWords(text) })
      : written
  }
}
