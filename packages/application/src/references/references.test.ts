import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { CardLinks } from '../ports/reference-repository'
import { cardsLinkingTo } from './references'

const p = (path: string) => path as ProjectPath
const card = (text: string, links: string[], section: string | null = 'Beginning'): CardLinks => ({
  outline: p('outlines/main-story.md'),
  outlineTitle: 'Main story',
  section,
  card: text,
  links: links.map(p),
})

describe('"From the outline": the cards about a chapter', () => {
  const cards = [
    card('Ilka crosses the river', ['manuscript/the-crossing.md', 'characters/ilka.md', 'places/marrow.md']),
    card('The gate', ['manuscript/the-orchard-gate.md']),
    card('Back to the crossing', ['manuscript/the-crossing.md'], 'Ending'),
  ]

  it('finds the cards that link to the chapter, with their other links', () => {
    expect(cardsLinkingTo(cards, p('manuscript/the-crossing.md'))).toEqual([
      { ...cards[0], links: ['characters/ilka.md', 'places/marrow.md'] },
      { ...cards[2], links: [] },
    ])
  })

  it('finds nothing for a chapter no card mentions', () => {
    expect(cardsLinkingTo(cards, p('manuscript/frost.md'))).toEqual([])
  })

  it('lists a link a card repeats once', () => {
    expect(cardsLinkingTo([card('x', ['manuscript/a.md', 'characters/b.md', 'characters/b.md'])], p('manuscript/a.md'))[0]?.links).toEqual(['characters/b.md'])
  })
})
