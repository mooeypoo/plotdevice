import { isSceneBreakText, onlyDirection, type Direction, type ImportPlan } from '@plotdevice/domain'
import { importedChapterMarkdown, type ImportedBlock } from '@plotdevice/markdown'
import type { ImportedManuscript } from './read-docx'

/** A chapter ready to be written into the book: its title, its part (or none), and its text as Markdown. */
export interface ImportedChapterText {
  title: string
  part: string | null
  body: string
}

/**
 * The chapters the author kept in the preview, as Markdown (Milestone 23). A paragraph whose letters
 * all run against the book's direction (an English paragraph in a Hebrew book) gets a direction mark;
 * a line of only `* * *`, `#` or the like becomes a scene break.
 */
export function importedChapters(manuscript: ImportedManuscript, plan: ImportPlan, bookDirection: Direction): ImportedChapterText[] {
  return plan.chapters
    .filter((chapter) => chapter.included)
    .map((chapter) => {
      const blocks = chapter.body.flatMap((index): ImportedBlock[] => {
        const paragraph = manuscript.paragraphs[index]
        if (!paragraph) return []
        if (isSceneBreakText(paragraph.text)) return [{ kind: 'scene-break' }]
        const only = onlyDirection(paragraph.text)
        const direction = only !== null && only !== bookDirection ? { direction: only } : {}
        const { inlines } = paragraph
        switch (paragraph.kind) {
          case 'heading':
            return [{ kind: 'heading', level: paragraph.level, inlines, ...direction }]
          case 'list-item':
            return [{ kind: 'list-item', ordered: paragraph.ordered, depth: paragraph.depth, inlines, ...direction }]
          default:
            return [{ kind: paragraph.kind, inlines, ...direction }]
        }
      })
      return { title: chapter.name, part: chapter.part, body: importedChapterMarkdown(blocks, manuscript.footnotes) }
    })
}
