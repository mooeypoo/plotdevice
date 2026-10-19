import { buildLinkIndex } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import {
  chapterReferences,
  type ChapterReference,
  type ReferenceKey
} from '../../domain/chapter-references'
import { arrangeManuscript } from '../../domain/manuscript'
import type { ManuscriptRepository } from '../../domain/ports/manuscript-repository'

export type { ReferenceKey }

/** A chapter and the files its story keys point to. */
export interface ReferencingChapter {
  readonly path: ProjectPath
  readonly title: string
  readonly references: readonly ChapterReference[]
}

/** Every chapter with its references, in manuscript order; unordered chapters come last. */
export type ListChapterReferences = () => Promise<readonly ReferencingChapter[]>

/** Builds the `ListChapterReferences` query. */
export function createListChapterReferences(ports: {
  readonly repository: ManuscriptRepository
}): ListChapterReferences {
  return async () => {
    const files = await ports.repository.load()
    const links = buildLinkIndex(files.linkCandidates)
    const manuscript = arrangeManuscript(files.parts, files.chapters, links)
    const ordered = [
      ...[...manuscript.parts, ...manuscript.unnumberedParts].flatMap((section) =>
        section.chapters.map((entry) => entry.chapter)
      ),
      ...manuscript.chapters.map((entry) => entry.chapter),
      ...manuscript.unordered.map((entry) => entry.chapter)
    ]
    const sources = new Map(files.sources.map((source) => [source.path, source]))
    return ordered.map((chapter) => {
      const source = sources.get(chapter.path)
      return {
        path: chapter.path,
        title: chapter.title,
        references: source === undefined ? [] : chapterReferences(source, links)
      }
    })
  }
}
