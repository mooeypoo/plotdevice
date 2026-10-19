import { isMapping, readEntryText } from '../../../shared-kernel/frontmatter-values'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { readTextList, type CodexKind } from './codex-entry'

/** One entry of a character's `relationships` list, as written. */
export interface Relationship {
  /** The link as written, for example `[[Aunt Bea]]`. */
  readonly with: string
  readonly kind?: string
  readonly note?: string
}

/** A key the app doesn't edit, shown read-only so the writer sees the whole file. */
export interface OtherKey {
  readonly key: string
  readonly value: string
}

/** A codex entry's frontmatter as the inspector shows it. */
export interface CodexProperties {
  readonly path: ProjectPath
  readonly kind: CodexKind
  readonly title?: string
  readonly aliases: readonly string[]
  readonly role?: string
  /** A character's `born`, as written; a list is shown comma-separated. */
  readonly born?: string
  readonly relationships: readonly Relationship[]
  readonly otherKeys: readonly OtherKey[]
}

const OWN_KEYS: Readonly<Record<CodexKind, readonly string[]>> = {
  character: ['type', 'title', 'aliases', 'role', 'born', 'relationships'],
  location: ['type', 'title', 'aliases'],
  note: ['type', 'title']
}

/** Reads the inspector's view of a codex entry. */
export function readCodexProperties(
  path: ProjectPath,
  kind: CodexKind,
  frontmatter: unknown
): CodexProperties {
  const keys = isMapping(frontmatter) ? frontmatter : {}
  const title = readEntryText(keys['title'])
  const role = kind === 'character' ? readEntryText(keys['role']) : undefined
  const born = kind === 'character' ? readTextList(keys['born']).join(', ') : ''
  return {
    path,
    kind,
    ...(title !== undefined ? { title } : {}),
    aliases: kind === 'note' ? [] : readTextList(keys['aliases']),
    ...(role !== undefined ? { role } : {}),
    ...(born !== '' ? { born } : {}),
    relationships: kind === 'character' ? readRelationships(keys['relationships']) : [],
    otherKeys: Object.entries(keys)
      .filter(([key]) => !OWN_KEYS[kind].includes(key))
      .map(([key, value]) => ({ key, value: describeValue(value) }))
  }
}

function readRelationships(value: unknown): Relationship[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item: unknown) => {
    if (!isMapping(item)) return []
    const withLink = readEntryText(item['with'])
    if (withLink === undefined) return []
    const kind = readEntryText(item['kind'])
    const note = readEntryText(item['note'])
    return [
      {
        with: withLink,
        ...(kind !== undefined ? { kind } : {}),
        ...(note !== undefined ? { note } : {})
      }
    ]
  })
}

/** A value as one line of text: scalars as written, lists joined, anything deeper as JSON. */
function describeValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value) && value.every((item) => typeof item !== 'object' || item === null)) {
    return value.map((item) => describeValue(item)).join(', ')
  }
  return JSON.stringify(value)
}
