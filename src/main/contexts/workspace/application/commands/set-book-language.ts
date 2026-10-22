import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { isLanguageTag } from '../../../../shared-kernel/language-tag'
import { err, type Result } from '../../../../shared-kernel/result'
import type { NovelFileStore } from '../../domain/ports/novel-file-store'
import type { ProjectRoot } from '../../domain/project-root'
import type { OpenedProject, OpenProjectError, ReadProject } from './open-project'

/** Why the book's language couldn't be changed. */
export type SetBookLanguageError = OpenProjectError | DomainError

/**
 * Sets the book's `language` in novel.md on the writer's explicit request, changing only that key,
 * and returns the project as read again. Words already in the book are never rewritten (ADR 0019).
 */
export type SetBookLanguage = (
  root: ProjectRoot,
  language: string
) => Promise<Result<OpenedProject, SetBookLanguageError>>

/** Builds the `SetBookLanguage` use case. */
export function createSetBookLanguage(ports: {
  readonly novelFiles: NovelFileStore
  readonly readProject: ReadProject
}): SetBookLanguage {
  return async (root, language) => {
    const tag = language.trim()
    if (!isLanguageTag(tag)) {
      return err(
        domainError('invalid-language', 'That is not a language tag.', {
          reason: 'invalid-request'
        })
      )
    }
    const current = await ports.readProject(root)
    if (!current.ok) return current
    if (current.value.project.readOnly) {
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    }
    const written = await ports.novelFiles.setKey(root, 'language', tag)
    if (!written.ok) return written
    return ports.readProject(root)
  }
}
