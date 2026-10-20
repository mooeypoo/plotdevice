import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { buildLinkIndex } from '../../../../shared-kernel/link-index'
import { isMapping } from '../../../../shared-kernel/frontmatter-values'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { ManuscriptSettings } from '../../domain/manuscript-settings'
import type {
  ManuscriptRepository,
  ReadEntryTextError,
  WritePropertiesError
} from '../../domain/ports/manuscript-repository'
import { pathFormRewrite, quotedLinkValue } from '../../domain/warning-fixes'

/** A warning's fix as the writer chose it: for an ambiguous link, which file it means. */
export type ChosenFix =
  | { readonly kind: 'path-form'; readonly name: string; readonly choice: ProjectPath }
  | { readonly kind: 'quote'; readonly key: string }

/** Why a fix wasn't applied. The file is untouched. */
export type FixWarningError =
  WritePropertiesError | ReadEntryTextError | DomainError<'read-only' | 'nothing-to-fix'>

/**
 * Applies a warning's fix to one part or chapter, changing only the links concerned: the
 * writer's one-click answer to "this link could mean two files" or "this link isn't quoted".
 */
export type FixWarning = (
  path: ProjectPath,
  fix: ChosenFix
) => Promise<Result<{ readonly version: string }, FixWarningError>>

/** Builds the `FixWarning` command. */
export function createFixWarning(ports: {
  readonly repository: ManuscriptRepository
  readonly settings: ManuscriptSettings
}): FixWarning {
  return async (path, fix) => {
    if (ports.settings.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    if (fix.kind === 'path-form') {
      const files = await ports.repository.load()
      const links = buildLinkIndex(files.linkCandidates)
      const rewritten = await ports.repository.rewriteLinks(
        path,
        pathFormRewrite(fix.name, fix.choice, links),
        undefined
      )
      if (!rewritten.ok) return rewritten
      return rewritten.value.count > 0
        ? ok({ version: rewritten.value.version })
        : err(domainError('nothing-to-fix', `No link to “${fix.name}” needs a folder any more.`))
    }

    const read = await ports.repository.readEntryFile(path)
    if (!read.ok) return read
    const keys = isMapping(read.value.frontmatter) ? read.value.frontmatter : {}
    const value = quotedLinkValue(keys[fix.key])
    if (value === undefined || value === keys[fix.key]) {
      return err(domainError('nothing-to-fix', `“${fix.key}” has nothing to put in quotes.`))
    }
    const written = await ports.repository.writeProperties(
      path,
      [{ key: fix.key, value }],
      read.value.version
    )
    return written.ok ? ok({ version: written.value.version }) : written
  }
}
