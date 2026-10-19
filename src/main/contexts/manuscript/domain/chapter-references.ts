import { isMapping } from '../../../shared-kernel/frontmatter-values'
import type { LinkIndex } from '../../../shared-kernel/link-index'
import { linkKeyType } from '../../../shared-kernel/link-key-type'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { readLinkList } from '../../../shared-kernel/read-link-value'
import type { EntrySource } from './entry-warnings'

/** The story keys that point from a chapter to codex entries. */
export type ReferenceKey = 'pov' | 'characters' | 'location'

const REFERENCE_KEYS: readonly ReferenceKey[] = ['pov', 'characters', 'location']

/** A file a chapter's frontmatter points to, and under which key. */
export interface ChapterReference {
  readonly key: ReferenceKey
  readonly path: ProjectPath
}

/**
 * The files a chapter's `pov`, `characters`, and `location` resolve to (see "Derived data" in
 * docs/file-format.md). Links that resolve to nothing, or to several files, point nowhere.
 */
export function chapterReferences(source: EntrySource, links: LinkIndex): ChapterReference[] {
  const keys = isMapping(source.frontmatter) ? source.frontmatter : {}
  const references: ChapterReference[] = []
  for (const key of REFERENCE_KEYS) {
    for (const link of readLinkList(keys[key]).links) {
      const resolution = links.resolve(link, linkKeyType(key))
      if (resolution.kind === 'resolved') references.push({ key, path: resolution.path })
    }
  }
  return references
}
