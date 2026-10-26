import type { ReferenceSummary } from '@plotdevice/domain'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { CardLinks } from '../ports/reference-repository'
import { cardsLinkingTo, linkedFrom } from './references'

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
    expect(cardsLinkingTo([card('x', ['manuscript/a.md', 'characters/b.md', 'characters/b.md'])], p('manuscript/a.md'))[0]?.links).toEqual([
      'characters/b.md',
    ])
  })
})

describe('"Linked from": everything that links to a page', () => {
  const summary = (
    file: string,
    title: string,
    links: string[],
    relationships: { text: string; links: string[] }[] = [],
  ): ReferenceSummary => ({
    file: p(file),
    kind: 'character',
    title,
    aka: [],
    description: null,
    relationships: relationships.map((relationship) => ({ text: relationship.text, links: relationship.links.map(p) })),
    links: links.map(p),
  })
  const bea = p('characters/bea.md')
  const pages = [
    summary(
      'characters/ilka.md',
      'Ilka Varga',
      ['characters/bea.md', 'places/marrow.md'],
      [
        { text: 'Niece of [Bea](bea.md)', links: ['characters/bea.md'] },
        { text: 'Lives in [Marrow](../places/marrow.md)', links: ['places/marrow.md'] },
      ],
    ),
    summary('characters/noel.md', 'Noël Arany', ['characters/bea.md']),
    summary('characters/bea.md', 'Bea Halmi', ['characters/bea.md']),
    summary('places/marrow.md', 'Marrow', ['characters/ilka.md']),
  ]
  const cards = [card('Bea at the landing', ['characters/bea.md', 'places/marrow.md']), card('The gate', ['manuscript/gate.md'])]
  const chapters = [
    { file: p('manuscript/prologue.md'), links: [bea] },
    { file: p('manuscript/frost.md'), links: [p('places/marrow.md')] },
  ]

  it('lists the cards, the pages (with the relationships that point here) and the chapters', () => {
    expect(linkedFrom(bea, { cards, pages, chapters })).toEqual({
      cards: [{ ...cards[0], links: ['places/marrow.md'] }],
      pages: [
        { file: 'characters/ilka.md', kind: 'character', title: 'Ilka Varga', relationships: ['Niece of [Bea](bea.md)'] },
        { file: 'characters/noel.md', kind: 'character', title: 'Noël Arany', relationships: [] },
      ],
      chapters: ['manuscript/prologue.md'],
    })
  })

  it('leaves out the page itself, and finds nothing for a page nothing links to', () => {
    expect(linkedFrom(p('characters/noel.md'), { cards, pages, chapters })).toEqual({ cards: [], pages: [], chapters: [] })
  })
})
