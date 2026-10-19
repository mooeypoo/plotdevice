import type { ProjectPath } from '../../../shared-kernel/project-path'
import { isMapping } from './frontmatter-values'

/**
 * A part's or chapter's frontmatter as the inspector shows it: the values as written, so the
 * writer sees exactly what the file says.
 */
export interface EntryProperties {
  readonly path: ProjectPath
  readonly kind: 'part' | 'chapter'
  readonly title?: string
  readonly status?: string
  readonly pov: readonly string[]
  readonly characters: readonly string[]
  readonly location: readonly string[]
  readonly threads: readonly string[]
  /** As written; a list is shown comma-separated. */
  readonly storyDate?: string
  readonly storyTime?: string
  readonly synopsis?: string
  /** The `part` value as written, for example `[[Part One]]`. */
  readonly part?: string
  /** The `order` value as written, even when it isn't a whole number. */
  readonly order?: string
}

/** Reads the inspector's view of a file's frontmatter. */
export function readEntryProperties(
  path: ProjectPath,
  kind: 'part' | 'chapter',
  frontmatter: unknown
): EntryProperties {
  const keys = isMapping(frontmatter) ? frontmatter : {}
  const optional = (name: string, value: string | undefined): Record<string, string> =>
    value === undefined ? {} : { [name]: value }
  return {
    path,
    kind,
    ...optional('title', text(keys['title'])),
    ...optional('status', text(keys['status'])),
    pov: list(keys['pov']),
    characters: list(keys['characters']),
    location: list(keys['location']),
    threads: list(keys['threads']),
    ...optional('storyDate', list(keys['story_date']).join(', ') || undefined),
    ...optional('storyTime', text(keys['story_time'])),
    ...optional('synopsis', text(keys['synopsis'])),
    ...optional('part', text(keys['part']) ?? linkInList(keys['part'])),
    ...optional('order', text(keys['order']))
  }
}

/** A scalar as text; anything else is not shown as text. */
function text(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

/** A value that may be one item or a list, as a list of texts. An unquoted `[[x]]` reads as `[[x]]`. */
function list(value: unknown): string[] {
  if (value === undefined || value === null) return []
  const unquoted = linkInList(value)
  if (unquoted !== undefined) return [unquoted]
  const items = Array.isArray(value) ? (value as unknown[]) : [value]
  return items.flatMap((item) => {
    const asText = text(item) ?? linkInList(item)
    return asText === undefined ? [] : [asText]
  })
}

/** YAML reads an unquoted `[[x]]` as `[["x"]]`; turn it back into the link the writer typed. */
function linkInList(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 1) return undefined
  const inner: unknown = value[0]
  if (!Array.isArray(inner) || inner.length !== 1 || typeof inner[0] !== 'string') return undefined
  return `[[${inner[0]}]]`
}
