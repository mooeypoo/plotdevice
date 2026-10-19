import { linkTo } from '../../../shared-kernel/entry-link'
import { isMapping } from '../../../shared-kernel/frontmatter-values'
import type { LinkCandidate, LinkIndex } from '../../../shared-kernel/link-index'
import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { readLinkValue } from '../../../shared-kernel/read-link-value'

/** One entry of a character's `relationships` list, as written. */
export interface Relationship {
  /** The link as written, for example `[[Aunt Bea]]`. */
  readonly with: string
  readonly kind?: string
  readonly note?: string
}

/** A relationship as the writer edits it: the other character by name, plus kind and note. */
export interface RelationshipEdit {
  /** The other character's file name (link target), for example `Aunt Bea`. */
  readonly with: string
  readonly kind?: string
  readonly note?: string
}

/** One relationship's fields in the order they're written: `with`, `kind`, `note`. */
export type RelationshipFields = readonly (readonly [field: string, value: string])[]

/**
 * The fields to write for each relationship. An existing link to the same character is kept as
 * written (its shown text, its path form); a new one names the file, with its folder when another
 * file shares the name. Empty kinds and notes are left out.
 */
export function relationshipFields(
  edits: readonly RelationshipEdit[],
  existing: readonly Relationship[],
  candidates: readonly LinkCandidate[],
  links: LinkIndex
): RelationshipFields[] {
  return edits.map((edit) => {
    const target = nameComparisonKey(edit.with)
    const kept = existing.find((relationship) => {
      const read = readLinkValue(relationship.with)
      return read.kind === 'link' && nameComparisonKey(read.link.target) === target
    })
    let link = kept?.with
    if (link === undefined) {
      const resolution = links.resolve({ target: edit.with, embed: false }, 'character')
      link =
        resolution.kind === 'resolved' ? linkTo(resolution.path, candidates) : `[[${edit.with}]]`
    }
    const fields: [string, string][] = [['with', link]]
    const kind = edit.kind?.trim() ?? ''
    const note = edit.note?.trim() ?? ''
    if (kind !== '') fields.push(['kind', kind])
    if (note !== '') fields.push(['note', note])
    return fields
  })
}

/** A codex entry's frontmatter, for finding who lists whom. */
export interface CodexSource {
  readonly path: ProjectPath
  readonly title: string
  readonly frontmatter: unknown
}

/** Another character's relationship to this one, shown read-only on this one's profile. */
export interface ListedBy {
  readonly path: ProjectPath
  readonly title: string
  readonly kind?: string
  readonly note?: string
}

/** The characters whose `relationships` point to `target`. Relationships are one-way. */
export function listedBy(
  target: ProjectPath,
  sources: readonly CodexSource[],
  links: LinkIndex
): ListedBy[] {
  return sources.flatMap((source) => {
    if (source.path === target || !isMapping(source.frontmatter)) return []
    const list = source.frontmatter['relationships']
    if (!Array.isArray(list)) return []
    return list.flatMap((item: unknown) => {
      if (!isMapping(item)) return []
      const read = readLinkValue(item['with'])
      if (read.kind !== 'link') return []
      const resolution = links.resolve(read.link, 'character')
      if (resolution.kind !== 'resolved' || resolution.path !== target) return []
      const kind = typeof item['kind'] === 'string' ? item['kind'] : undefined
      const note = typeof item['note'] === 'string' ? item['note'] : undefined
      return [
        {
          path: source.path,
          title: source.title,
          ...(kind !== undefined ? { kind } : {}),
          ...(note !== undefined ? { note } : {})
        }
      ]
    })
  })
}

/**
 * Whether the app can edit a `relationships` value as read: missing, or a list of mappings with
 * plain values. Anything else is shown read-only, with a note.
 */
export function canEditRelationships(value: unknown): boolean {
  if (value === undefined || value === null) return true
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        isMapping(item) &&
        Object.values(item).every(
          (field) => field === null || ['string', 'number', 'boolean'].includes(typeof field)
        )
    )
  )
}
