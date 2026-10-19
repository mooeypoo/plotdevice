import type { EntryType } from './entry-type'

const KEY_TYPES: Readonly<Record<string, EntryType>> = {
  part: 'part',
  pov: 'character',
  characters: 'character',
  location: 'location'
}

/**
 * The type a frontmatter key's links expect, which settles links whose name several files share
 * (see "Links" in docs/file-format.md). Other keys, and prose, expect no type.
 */
export function linkKeyType(key: string): EntryType | undefined {
  return Object.hasOwn(KEY_TYPES, key) ? KEY_TYPES[key] : undefined
}
