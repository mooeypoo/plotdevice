import { isMapping, readEntryText } from '../../../shared-kernel/frontmatter-values'
import { projectPathStem, type ProjectPath } from '../../../shared-kernel/project-path'
import { characterGroups } from './character-groups'

/** The kinds of codex entry, each a `type` value. */
export type CodexKind = 'character' | 'location' | 'note'

export const CODEX_KINDS: readonly CodexKind[] = ['character', 'location', 'note']

/** A character, location, or note, as the codex list shows it. */
export interface CodexEntry {
  readonly path: ProjectPath
  readonly kind: CodexKind
  /** The `title` key, or the file name without `.md`. */
  readonly title: string
  readonly aliases: readonly string[]
  /** A character's `role`. */
  readonly role?: string
  /** Overlapping character groups; absent for other entry kinds. */
  readonly groups?: readonly string[]
}

/** Reads a codex entry from its frontmatter values. */
export function readCodexEntry(
  path: ProjectPath,
  kind: CodexKind,
  frontmatter: unknown
): CodexEntry {
  const keys = isMapping(frontmatter) ? frontmatter : {}
  const role = kind === 'character' ? readEntryText(keys['role']) : undefined
  return {
    path,
    kind,
    title: readEntryText(keys['title']) ?? projectPathStem(path),
    aliases: readTextList(keys['aliases']),
    ...(kind === 'character' ? { groups: characterGroups(keys['groups']) } : {}),
    ...(role !== undefined ? { role } : {})
  }
}

/** One text or a list of texts, as a list; anything that isn't text is skipped. */
export function readTextList(value: unknown): string[] {
  const items: unknown[] = Array.isArray(value) ? value : [value]
  return items.flatMap((item) => {
    const text = readEntryText(item)
    return text === undefined ? [] : [text]
  })
}
