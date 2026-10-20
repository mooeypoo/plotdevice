/** What a file is, from its frontmatter `type` key (see "Entry types" in docs/file-format.md). */
export const ENTRY_TYPES = [
  'part',
  'chapter',
  'character',
  'location',
  'note',
  'outline',
  'scene'
] as const

/** One of the entry types the app knows. */
export type EntryType = (typeof ENTRY_TYPES)[number]

/** A file's classification: a known type, or untyped (keeping any unknown value to show it). */
export type EntryClassification =
  | { readonly kind: 'typed'; readonly type: EntryType }
  | { readonly kind: 'untyped'; readonly rawType?: string }

/** Classifies the raw value of a file's `type` key. */
export function classifyEntryType(value: unknown): EntryClassification {
  if (value === undefined || value === null) return { kind: 'untyped' }
  if (typeof value === 'string' && isEntryType(value)) return { kind: 'typed', type: value }
  return { kind: 'untyped', rawType: typeof value === 'string' ? value : JSON.stringify(value) }
}

function isEntryType(value: string): value is EntryType {
  return (ENTRY_TYPES as readonly string[]).includes(value)
}
