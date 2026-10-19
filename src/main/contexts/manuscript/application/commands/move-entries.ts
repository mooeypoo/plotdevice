import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { parseFileName } from '../../../../shared-kernel/file-name'
import { buildLinkIndex, type LinkIndex } from '../../../../shared-kernel/link-index'
import {
  isSameProjectPath,
  joinProjectPath,
  projectPathName,
  projectPathParent,
  type ProjectPath
} from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { Chapter } from '../../domain/chapter'
import { linkTo } from '../../domain/entry-link'
import { arrangeManuscript, type Manuscript } from '../../domain/manuscript'
import type { ManuscriptSettings } from '../../domain/manuscript-settings'
import { orderChanges, placeAt } from '../../domain/order-plan'
import type { EntryRelocator } from '../../domain/ports/entry-relocator'
import type {
  ManuscriptRepository,
  WritePropertiesError
} from '../../domain/ports/manuscript-repository'
import type { PropertyWrite } from '../../domain/property-changes'

/** Where a chapter goes: a position in a part, or in a book without parts (`part` undefined). */
export interface ChapterDestination {
  readonly part: ProjectPath | undefined
  readonly index: number
}

/** What a move changed. */
export interface Moved {
  /** The moved entry's path, which changes when its file moved to another part's folder. */
  readonly path: ProjectPath
  /** How many files had their frontmatter rewritten. */
  readonly changed: number
  /** Other files whose `order` couldn't be rewritten (left untouched). */
  readonly failed: readonly ProjectPath[]
}

/** Why nothing was moved. */
export type MoveError =
  WritePropertiesError | DomainError<'read-only' | 'not-found' | 'part-not-found' | 'part-required'>

/**
 * Puts a chapter at a position in a part, rewriting `order` only where it changes and `part` if
 * it changed. The file follows into the new part's folder only if it sat in the old part's folder.
 * `null` takes the chapter out of the book's order (it keeps its `part`).
 */
export type MoveChapter = (
  path: ProjectPath,
  destination: ChapterDestination | null
) => Promise<Result<Moved, MoveError>>

/** Puts a part at a position among the numbered parts. */
export type MovePart = (path: ProjectPath, index: number) => Promise<Result<Moved, MoveError>>

interface Ports {
  readonly repository: ManuscriptRepository
  readonly relocator: EntryRelocator
  readonly settings: ManuscriptSettings
}

const readOnly = domainError('read-only', 'This project is open read-only.')

/** Builds the `MoveChapter` command. */
export function createMoveChapter(ports: Ports): MoveChapter {
  return async (path, destination) => {
    if (ports.settings.readOnly) return err(readOnly)
    const files = await ports.repository.load()
    const links = buildLinkIndex(files.linkCandidates)
    const manuscript = arrangeManuscript(files.parts, files.chapters, links)
    const chapter = files.chapters.find((candidate) => candidate.path === path)
    if (chapter === undefined)
      return err(domainError('not-found', 'That chapter no longer exists.'))

    if (destination === null) {
      if (chapter.order === undefined) return ok({ path, changed: 0, failed: [] })
      const written = await ports.repository.writeProperties(
        path,
        [{ key: 'order', value: undefined }],
        undefined
      )
      return written.ok ? ok({ path, changed: 1, failed: [] }) : written
    }

    const sequence = chaptersAt(manuscript, files.parts.length > 0, destination.part)
    if (!sequence.ok) return sequence
    const oldPart = partOf(chapter, links)
    const partChanged =
      destination.part !== undefined &&
      (oldPart === undefined || !isSameProjectPath(oldPart, destination.part))

    const writes = new Map<ProjectPath, PropertyWrite[]>()
    for (const change of orderChanges(placeAt(sequence.value, chapter, destination.index))) {
      writes.set(change.path, [{ key: 'order', value: change.order }])
    }
    if (partChanged) {
      writes.set(path, [
        { key: 'part', value: linkTo(destination.part, files.linkCandidates) },
        ...(writes.get(path) ?? [])
      ])
    }

    // The moved chapter first: if it can't be written, nothing else is.
    const own = writes.get(path)
    if (own !== undefined) {
      const written = await ports.repository.writeProperties(path, own, undefined)
      if (!written.ok) return written
    }
    const failed: ProjectPath[] = []
    for (const [other, otherWrites] of writes) {
      if (other === path) continue
      const written = await ports.repository.writeProperties(other, otherWrites, undefined)
      if (!written.ok) failed.push(other)
    }

    let newPath = path
    if (partChanged && oldPart !== undefined) {
      const target = followingPath(path, oldPart, destination.part)
      if (target !== undefined) {
        const moved = await ports.relocator.relocate(path, target)
        if (moved.ok) newPath = target
      }
    }
    return ok({ path: newPath, changed: writes.size, failed })
  }
}

/** Builds the `MovePart` command. */
export function createMovePart(ports: Omit<Ports, 'relocator'>): MovePart {
  return async (path, index) => {
    if (ports.settings.readOnly) return err(readOnly)
    const files = await ports.repository.load()
    const manuscript = arrangeManuscript(
      files.parts,
      files.chapters,
      buildLinkIndex(files.linkCandidates)
    )
    const part = files.parts.find((candidate) => candidate.path === path)
    if (part === undefined) return err(domainError('not-found', 'That part no longer exists.'))
    const numbered = manuscript.parts.map((section) => section.part)

    const changes = orderChanges(placeAt(numbered, part, index))
    const failed: ProjectPath[] = []
    for (const change of changes) {
      const written = await ports.repository.writeProperties(
        change.path,
        [{ key: 'order', value: change.order }],
        undefined
      )
      if (!written.ok) {
        if (change.path === path) return written
        failed.push(change.path)
      }
    }
    return ok({ path, changed: changes.length - failed.length, failed })
  }
}

/** The chapters in order at a destination, without the one being moved filtered out yet. */
function chaptersAt(
  manuscript: Manuscript,
  hasParts: boolean,
  part: ProjectPath | undefined
): Result<Chapter[], DomainError<'part-not-found' | 'part-required'>> {
  if (part === undefined) {
    if (hasParts) return err(domainError('part-required', 'Choose a part for the chapter.'))
    return ok(manuscript.chapters.map((entry) => entry.chapter))
  }
  const section = [...manuscript.parts, ...manuscript.unnumberedParts].find(
    (candidate) => candidate.part.path === part
  )
  if (section === undefined)
    return err(domainError('part-not-found', 'That part no longer exists.'))
  return ok(section.chapters.map((entry) => entry.chapter))
}

/** The part a chapter's `part` key points to, if it points to one. */
function partOf(chapter: Chapter, links: LinkIndex): ProjectPath | undefined {
  if (chapter.part.kind !== 'link') return undefined
  const resolution = links.resolve(chapter.part.link, 'part')
  return resolution.kind === 'resolved' && links.typeOf(resolution.path) === 'part'
    ? resolution.path
    : undefined
}

/**
 * Where a chapter's file goes when it changes part: into the new part's folder, but only if it was
 * in the old part's folder. A file the writer put somewhere else stays where it is.
 */
function followingPath(
  path: ProjectPath,
  oldPart: ProjectPath,
  newPart: ProjectPath
): ProjectPath | undefined {
  const folder = projectPathParent(path)
  const oldFolder = projectPathParent(oldPart)
  const newFolder = projectPathParent(newPart)
  const inOldFolder =
    folder === oldFolder ||
    (folder !== undefined && oldFolder !== undefined && isSameProjectPath(folder, oldFolder))
  if (!inOldFolder || folder === newFolder) return undefined
  const name = parseFileName(projectPathName(path))
  return name.ok ? joinProjectPath(newFolder, name.value) : undefined
}
