import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { fileNameFromTitle } from '../../../../shared-kernel/file-name'
import { buildLinkIndex, type LinkCandidate } from '../../../../shared-kernel/link-index'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import {
  joinProjectPath,
  projectPathParent,
  projectPathStem,
  type ProjectPath
} from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { uniqueFileName } from '../../../../shared-kernel/unique-file-name'
import { linkTo } from '../../../../shared-kernel/entry-link'
import { arrangeManuscript } from '../../domain/manuscript'
import type { ManuscriptSettings } from '../../domain/manuscript-settings'
import { newChapterText, newPartText } from '../../domain/new-entry'
import type {
  CreateFileError,
  ManuscriptRepository
} from '../../domain/ports/manuscript-repository'

/** A newly created part or chapter. */
export interface CreatedEntry {
  readonly path: ProjectPath
  readonly version: string
}

/** Why an entry wasn't created. */
export type CreateEntryError = CreateFileError | DomainError<'read-only' | 'part-not-found'>

/**
 * Creates a chapter at the end of a part (or of a book without parts), in the part's folder,
 * named after its title. Only the keys it needs are written.
 */
export type CreateChapter = (
  partPath: ProjectPath | undefined,
  title: string
) => Promise<Result<CreatedEntry, CreateEntryError>>

/** Creates a part at the end of the numbered parts, in its own folder. */
export type CreatePart = (title: string) => Promise<Result<CreatedEntry, CreateEntryError>>

interface Ports {
  readonly repository: ManuscriptRepository
  readonly settings: ManuscriptSettings
}

/** Builds the `CreateChapter` command. */
export function createCreateChapter(ports: Ports): CreateChapter {
  return async (partPath, title) => {
    if (ports.settings.readOnly)
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    const files = await ports.repository.load()
    const manuscript = arrangeManuscript(
      files.parts,
      files.chapters,
      buildLinkIndex(files.linkCandidates)
    )
    const chapterTitle = title.trim() === '' ? ports.settings.words().untitledChapter : title.trim()

    let folder: ProjectPath | undefined
    let partLink: string | undefined
    let siblings: readonly { readonly chapter: { readonly order?: number } }[]
    if (partPath === undefined) {
      folder = ports.settings.chapterFolder
      siblings = manuscript.chapters
    } else {
      const section = [...manuscript.parts, ...manuscript.unnumberedParts].find(
        (candidate) => candidate.part.path === partPath
      )
      if (section === undefined)
        return err(
          domainError('part-not-found', 'That part no longer exists.', { reason: 'part-missing' })
        )
      folder = projectPathParent(partPath)
      partLink = linkTo(partPath, files.linkCandidates)
      siblings = section.chapters
    }

    const order = Math.max(0, ...siblings.map((entry) => entry.chapter.order ?? 0)) + 1
    const name = uniqueFileName(chapterTitle, 'chapter', stemsOf(files.linkCandidates))
    const path = joinProjectPath(folder, name)
    const created = await ports.repository.createFile(
      path,
      newChapterText(chapterTitle, partLink, order)
    )
    return created.ok ? ok({ path, version: created.value.version }) : created
  }
}

/** Builds the `CreatePart` command. */
export function createCreatePart(ports: Ports): CreatePart {
  return async (title) => {
    if (ports.settings.readOnly)
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    const files = await ports.repository.load()
    const partTitle = title.trim() === '' ? ports.settings.words().untitledPart : title.trim()
    const order = Math.max(0, ...files.parts.map((part) => part.order ?? 0)) + 1

    const name = uniqueFileName(partTitle, 'part', stemsOf(files.linkCandidates))
    const folder = joinProjectPath(
      ports.settings.partFolder,
      fileNameFromTitle(name.replace(/\.md$/u, ''), '')
    )
    const path = joinProjectPath(folder, name)
    const created = await ports.repository.createFile(path, newPartText(partTitle, order))
    return created.ok ? ok({ path, version: created.value.version }) : created
  }
}

function stemsOf(candidates: readonly LinkCandidate[]): Set<string> {
  return new Set(candidates.map((candidate) => nameComparisonKey(projectPathStem(candidate.path))))
}
