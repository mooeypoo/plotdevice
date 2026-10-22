import type { LinkAt } from '../../shared/link-at'
import { findWikiLinks } from '../../shared/wiki-link-scan'

/** How a chapter names someone or somewhere. */
export type CastRole = 'pov' | 'listed' | 'mentioned'

/** A character or place the chapter names, and how. */
export interface CastMember {
  readonly path: string
  readonly kind: 'character' | 'location'
  /** `pov` and `listed` come from the chapter's properties; `mentioned` only from its text. */
  readonly role: CastRole
}

/** What a chapter's properties name, as written (`"[[Ilka Szabó]]"`). */
export interface NamedInProperties {
  readonly pov: readonly string[]
  readonly characters: readonly string[]
  readonly location: readonly string[]
}

/** Prose with fenced and inline code removed; links in code don't count (file-format.md). */
export function withoutCode(markdown: string): string {
  return markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gmu, '').replace(/`[^`\n]*`/gu, '')
}

/** The wikilinks in a property value (one link, or text with links in it). */
function linksIn(value: string): LinkAt[] {
  return findWikiLinks(value).map((link) => ({ kind: 'wiki', target: link.target }))
}

/**
 * The characters and places a chapter names: its point of view first, then listed characters,
 * places, and finally entries only its text links to. Each file appears once, under its first role.
 */
export function castMembers(
  named: NamedInProperties,
  body: string,
  resolve: (link: LinkAt) => string | undefined,
  kindOf: (path: string) => string | undefined
): CastMember[] {
  const members = new Map<string, CastMember>()
  const add = (link: LinkAt, role: CastRole): void => {
    const path = resolve(link)
    if (path === undefined || members.has(path)) return
    const kind = kindOf(path)
    if (kind === 'character' || kind === 'location') members.set(path, { path, kind, role })
  }
  for (const value of named.pov) for (const link of linksIn(value)) add(link, 'pov')
  for (const value of named.characters) for (const link of linksIn(value)) add(link, 'listed')
  for (const value of named.location) for (const link of linksIn(value)) add(link, 'listed')
  for (const link of linksIn(withoutCode(body))) add(link, 'mentioned')
  const order = (member: CastMember): number =>
    member.role === 'pov'
      ? 0
      : member.role === 'mentioned'
        ? 3
        : member.kind === 'character'
          ? 1
          : 2
  return [...members.values()].sort((a, b) => order(a) - order(b))
}
