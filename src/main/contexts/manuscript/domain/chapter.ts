import { projectPathStem, type ProjectPath } from '../../../shared-kernel/project-path'
import { readLinkList, readLinkValue, type LinkValue } from '../../../shared-kernel/read-link-value'
import { readEntryText, readInteger, isMapping } from '../../../shared-kernel/frontmatter-values'
import { countWords } from '../../../shared-kernel/word-count'

/** A chapter (`type: chapter`): the unit of prose and story metadata. */
export interface Chapter {
  readonly path: ProjectPath
  readonly title: string
  /** The `part` key: which part the chapter belongs to. */
  readonly part: LinkValue
  /** Position within its part. */
  readonly order?: number
  /** Any value; the project's `statuses` list is an open set. */
  readonly status?: string
  readonly synopsis?: string
  /** The `pov` link targets, as written (`Ilka Szabó`). */
  readonly pov: readonly string[]
  /** The `threads` keys. */
  readonly threads: readonly string[]
  readonly wordCount: number
}

/** Reads a chapter from its frontmatter values and body. */
export function readChapter(path: ProjectPath, frontmatter: unknown, body: string): Chapter {
  const keys = isMapping(frontmatter) ? frontmatter : {}
  const order = readInteger(keys['order'])
  const status = readEntryText(keys['status'])
  const synopsis = readEntryText(keys['synopsis'])
  return {
    path,
    title: readEntryText(keys['title']) ?? projectPathStem(path),
    part: readLinkValue(keys['part']),
    ...(order !== undefined ? { order } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(synopsis !== undefined ? { synopsis } : {}),
    pov: readLinkList(keys['pov']).links.map((link) => link.target),
    threads: (Array.isArray(keys['threads']) ? (keys['threads'] as unknown[]) : [keys['threads']])
      .map((thread) => readEntryText(thread))
      .filter((thread): thread is string => thread !== undefined),
    wordCount: countWords(body)
  }
}
