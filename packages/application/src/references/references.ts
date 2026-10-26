import type { ReferenceKind, ReferenceSummary } from '@plotdevice/domain'
import { collisionKey, type ProjectPath } from '@plotdevice/shared'
import type { CardLinks, FileLinks } from '../ports/reference-repository'

/**
 * The outline cards that link to `file` (a chapter being written), each with what else it links to.
 * Links are explicit; nothing is inferred from names (AGENTS.md).
 */
export function cardsLinkingTo(cards: readonly CardLinks[], file: ProjectPath): CardLinks[] {
  const key = collisionKey(file)
  return cards
    .filter((card) => card.links.some((link) => collisionKey(link) === key))
    .map((card) => ({ ...card, links: [...new Set(card.links.filter((link) => collisionKey(link) !== key))] }))
}

/** What links to a page: outline cards, other pages and chapters (Milestone 11). */
export interface LinkedFrom {
  cards: CardLinks[]
  /** Each page with the relationships on it that point here (ADR 0009), if any. */
  pages: { file: ProjectPath; kind: ReferenceKind; title: string; relationships: string[] }[]
  chapters: ProjectPath[]
}

/** Everything that links to `file`. Only links the author wrote count; nothing is guessed from names. */
export function linkedFrom(
  file: ProjectPath,
  sources: { cards: readonly CardLinks[]; pages: readonly ReferenceSummary[]; chapters: readonly FileLinks[] },
): LinkedFrom {
  const key = collisionKey(file)
  const points = (links: readonly ProjectPath[]): boolean => links.some((link) => collisionKey(link) === key)
  return {
    cards: cardsLinkingTo(sources.cards, file),
    pages: sources.pages
      .filter((page) => collisionKey(page.file) !== key && points(page.links))
      .map((page) => ({
        file: page.file,
        kind: page.kind,
        title: page.title,
        relationships: page.relationships.filter((relationship) => points(relationship.links)).map((relationship) => relationship.text),
      })),
    chapters: sources.chapters.filter((chapter) => points(chapter.links)).map((chapter) => chapter.file),
  }
}
