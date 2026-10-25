import { collisionKey, type ProjectPath } from '@plotdevice/shared'
import type { CardLinks } from '../ports/reference-repository'

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
