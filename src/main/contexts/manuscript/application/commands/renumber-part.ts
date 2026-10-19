import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { buildLinkIndex } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { arrangeManuscript } from '../../domain/manuscript'
import type { ManuscriptSettings } from '../../domain/manuscript-settings'
import type { ManuscriptRepository } from '../../domain/ports/manuscript-repository'

/** What a renumbering changed. */
export interface Renumbered {
  /** The new version of every file whose `order` was rewritten. */
  readonly versions: Readonly<Record<string, string>>
  /** Files that couldn't be rewritten (left untouched). */
  readonly failed: readonly ProjectPath[]
}

/**
 * Rewrites the `order` of a part's chapters to 1, 2, 3… in their current order, changing only the
 * files whose number differs. `undefined` renumbers the chapters of a book without parts.
 */
export type RenumberPart = (
  partPath: ProjectPath | undefined
) => Promise<Result<Renumbered, DomainError<'read-only' | 'part-not-found'>>>

/** Builds the `RenumberPart` command. */
export function createRenumberPart(ports: {
  readonly repository: ManuscriptRepository
  readonly settings: ManuscriptSettings
}): RenumberPart {
  return async (partPath) => {
    if (ports.settings.readOnly)
      return err(domainError('read-only', 'This project is open read-only.'))
    const files = await ports.repository.load()
    const manuscript = arrangeManuscript(
      files.parts,
      files.chapters,
      buildLinkIndex(files.linkCandidates)
    )
    const chapters =
      partPath === undefined
        ? manuscript.chapters
        : [...manuscript.parts, ...manuscript.unnumberedParts].find((s) => s.part.path === partPath)
            ?.chapters
    if (chapters === undefined)
      return err(domainError('part-not-found', 'That part no longer exists.'))

    const versions: Record<string, string> = {}
    const failed: ProjectPath[] = []
    for (const [index, { chapter }] of chapters.entries()) {
      const order = index + 1
      if (chapter.order === order) continue
      const written = await ports.repository.writeProperties(
        chapter.path,
        [{ key: 'order', value: order }],
        undefined
      )
      if (written.ok) versions[chapter.path] = written.value.version
      else failed.push(chapter.path)
    }
    return ok({ versions, failed })
  }
}
