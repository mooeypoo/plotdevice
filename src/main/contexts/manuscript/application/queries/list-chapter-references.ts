import { buildLinkIndex } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import {
  chapterReferences,
  type ChapterReference,
  type ReferenceKey
} from '../../domain/chapter-references'
import { isMapping, readEntryText } from '../../../../shared-kernel/frontmatter-values'
import type { Chapter } from '../../domain/chapter'
import { arrangeManuscript, type PartSection } from '../../domain/manuscript'
import type { ManuscriptRepository } from '../../domain/ports/manuscript-repository'

export type { ReferenceKey }

/** A chapter and the files its story keys point to, with what the timeline shows of it. */
export interface ReferencingChapter {
  readonly path: ProjectPath
  readonly title: string
  readonly references: readonly ChapterReference[]
  /** In the book's reading order (a numbered part, or a book without parts), or outside it. */
  readonly inBook: boolean
  /** Its position in its part (or the book), and the part's, when numbered. */
  readonly number?: number
  readonly partNumber?: number
  readonly partTitle?: string
  readonly status?: string
  readonly synopsis?: string
  readonly threads: readonly string[]
  /** `story_date` as written; chronology reads it. */
  readonly storyDate: unknown
  readonly storyTime?: string
}

/**
 * Every chapter with its references, in reading order; chapters outside the book (parts out of
 * the sequence, the unordered tray) come last.
 */
export type ListChapterReferences = () => Promise<readonly ReferencingChapter[]>

/** Builds the `ListChapterReferences` query. */
export function createListChapterReferences(ports: {
  readonly repository: ManuscriptRepository
}): ListChapterReferences {
  return async () => {
    const files = await ports.repository.load()
    const links = buildLinkIndex(files.linkCandidates)
    const manuscript = arrangeManuscript(files.parts, files.chapters, links)
    interface Placed {
      readonly chapter: Chapter
      readonly inBook: boolean
      readonly number?: number
      readonly part?: PartSection
    }
    const ordered: Placed[] = [
      ...manuscript.parts.flatMap((part) =>
        part.chapters.map((entry) => ({ ...entry, inBook: true, part }))
      ),
      ...manuscript.chapters.map((entry) => ({ ...entry, inBook: true })),
      ...manuscript.unnumberedParts.flatMap((part) =>
        part.chapters.map((entry) => ({ chapter: entry.chapter, inBook: false, part }))
      ),
      ...manuscript.unordered.map((entry) => ({ chapter: entry.chapter, inBook: false }))
    ]
    const sources = new Map(files.sources.map((source) => [source.path, source]))
    return ordered.map(({ chapter, inBook, number, part }) => {
      const source = sources.get(chapter.path)
      const keys = isMapping(source?.frontmatter) ? source.frontmatter : {}
      const storyTime = readEntryText(keys['story_time'])
      return {
        path: chapter.path,
        title: chapter.title,
        references: source === undefined ? [] : chapterReferences(source, links),
        inBook,
        ...(number !== undefined ? { number } : {}),
        ...(part?.number !== undefined ? { partNumber: part.number } : {}),
        ...(part !== undefined ? { partTitle: part.part.title } : {}),
        ...(chapter.status !== undefined ? { status: chapter.status } : {}),
        ...(chapter.synopsis !== undefined ? { synopsis: chapter.synopsis } : {}),
        threads: chapter.threads,
        storyDate: keys['story_date'],
        ...(storyTime !== undefined ? { storyTime } : {})
      }
    })
  }
}
