import { projectPathStem, type ProjectPath } from '../../../shared-kernel/project-path'
import { readEntryText, readInteger, isMapping } from '../../../shared-kernel/frontmatter-values'
import { countWords } from '../../../shared-kernel/word-count'

/** A part of the manuscript (`type: part`). Its body, such as an epigraph, is manuscript text. */
export interface Part {
  readonly path: ProjectPath
  readonly title: string
  /** Position among parts; a part without one is outside the numbered sequence. */
  readonly order?: number
  readonly synopsis?: string
  readonly wordCount: number
}

/** Reads a part from its frontmatter values and body. */
export function readPart(path: ProjectPath, frontmatter: unknown, body: string): Part {
  const keys = isMapping(frontmatter) ? frontmatter : {}
  const order = readInteger(keys['order'])
  const synopsis = readEntryText(keys['synopsis'])
  return {
    path,
    title: readEntryText(keys['title']) ?? projectPathStem(path),
    ...(order !== undefined ? { order } : {}),
    ...(synopsis !== undefined ? { synopsis } : {}),
    wordCount: countWords(body)
  }
}
