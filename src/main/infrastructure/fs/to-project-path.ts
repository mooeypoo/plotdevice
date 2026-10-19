import { isAbsolute, relative, sep } from 'node:path'
import { domainError, type DomainError } from '../../shared-kernel/domain-error'
import {
  parseProjectPath,
  type ProjectPath,
  type ProjectPathErrorCode
} from '../../shared-kernel/project-path'
import { err, type Result } from '../../shared-kernel/result'

/** Why an OS path has no `ProjectPath`. */
export type ToProjectPathError = DomainError<'outside-project' | ProjectPathErrorCode>

/**
 * Converts an absolute OS path inside the project into a `ProjectPath`. This is the only place
 * where OS separators become forward slashes, and where paths that escape the root are rejected.
 */
export function toProjectPath(
  rootOsPath: string,
  osPath: string
): Result<ProjectPath, ToProjectPathError> {
  const fromRoot = relative(rootOsPath, osPath)
  const escapes = fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)
  if (fromRoot === '' || escapes) {
    return err(domainError('outside-project', `"${osPath}" is not inside the project.`))
  }
  // On Linux a file name may contain "\"; parseProjectPath rejects it rather than misreading it.
  return parseProjectPath(sep === '/' ? fromRoot : fromRoot.split(sep).join('/'))
}
