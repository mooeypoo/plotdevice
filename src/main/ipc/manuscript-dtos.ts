import type { ChapterDto, ManuscriptDto, PartDto } from '../../contract/dtos'
import type { ManuscriptView } from '../contexts/manuscript/application/queries/get-manuscript'

type Manuscript = ManuscriptView['manuscript']
type PlacedChapter = Manuscript['chapters'][number]
type PartSection = Manuscript['parts'][number]

const MARKDOWN_EXTENSION = /\.md$/iu

/** Maps the arranged manuscript to what the binder shows. */
export function toManuscriptDto(view: ManuscriptView): ManuscriptDto {
  const { manuscript } = view
  return {
    parts: manuscript.parts.map(toPartDto),
    unnumberedParts: manuscript.unnumberedParts.map(toPartDto),
    chapters: manuscript.chapters.map(toChapterDto),
    unordered: manuscript.unordered.map(({ chapter, reason }) => ({
      chapter: toChapterDto({ chapter, duplicateOrder: false }),
      reason
    })),
    warnings: manuscript.warnings.map(({ paths, fix, ...warning }) => ({
      ...warning,
      paths: [...paths],
      ...(fix === undefined
        ? {}
        : { fix: fix.kind === 'path-form' ? { ...fix, choices: [...fix.choices] } : fix })
    })),
    wordCount: manuscript.wordCount,
    linkTargets: view.linkCandidates.map((candidate) => {
      const fileName = candidate.path.slice(candidate.path.lastIndexOf('/') + 1)
      const name = fileName.replace(MARKDOWN_EXTENSION, '')
      const { path } = candidate
      return candidate.type !== undefined ? { name, path, type: candidate.type } : { name, path }
    })
  }
}

function toPartDto(section: PartSection): PartDto {
  const { part } = section
  return {
    path: part.path,
    title: part.title,
    ...(section.number !== undefined ? { number: section.number } : {}),
    ...(part.order !== undefined ? { order: part.order } : {}),
    ...(part.synopsis !== undefined ? { synopsis: part.synopsis } : {}),
    wordCount: section.wordCount,
    chapters: section.chapters.map(toChapterDto)
  }
}

function toChapterDto(placed: PlacedChapter): ChapterDto {
  const { chapter } = placed
  return {
    path: chapter.path,
    title: chapter.title,
    ...(placed.number !== undefined ? { number: placed.number } : {}),
    ...(chapter.order !== undefined ? { order: chapter.order } : {}),
    ...(chapter.status !== undefined ? { status: chapter.status } : {}),
    ...(chapter.synopsis !== undefined ? { synopsis: chapter.synopsis } : {}),
    pov: [...chapter.pov],
    threads: [...chapter.threads],
    wordCount: chapter.wordCount,
    duplicateOrder: placed.duplicateOrder
  }
}
