import { describe, expect, it } from 'vitest'
import type { ChapterDto, ManuscriptDto } from '../../../../contract/dtos'
import { filterChoices, NO_FILTERS, overviewSections } from './overview-sections'

const chapter = (title: string, extra: Partial<ChapterDto> = {}): ChapterDto => ({
  path: `${title}.md`,
  title,
  wordCount: 10,
  duplicateOrder: false,
  pov: [],
  threads: [],
  ...extra
})

const book: ManuscriptDto = {
  parts: [
    {
      path: 'One.md',
      title: 'Part One: The Orchard',
      number: 1,
      wordCount: 30,
      chapters: [
        chapter('The Ferry', {
          number: 1,
          status: 'draft',
          pov: ['Ilka Szabó'],
          threads: ['main']
        }),
        chapter('First frost', {
          number: 2,
          status: 'idea',
          pov: ['ilka szabó'],
          threads: ['strike']
        })
      ]
    }
  ],
  unnumberedParts: [],
  chapters: [],
  unordered: [{ chapter: chapter('Lost'), reason: 'missing-order' }],
  warnings: [],
  wordCount: 30,
  linkTargets: []
}

describe('overviewSections', () => {
  it('lists the book in order, part by part, with the unordered tray last', () => {
    expect(
      overviewSections(book, NO_FILTERS).map((section) => [
        section.label,
        section.chapters.map((entry) => entry.title)
      ])
    ).toEqual([
      ['Part I', ['The Ferry', 'First frost']],
      ['Unordered', ['Lost']]
    ])
  })

  it('filters by status (including none), POV (any case), and thread', () => {
    const titles = (filters: Partial<typeof NO_FILTERS>): string[] =>
      overviewSections(book, { ...NO_FILTERS, ...filters }).flatMap((section) =>
        section.chapters.map((entry) => entry.title)
      )
    expect(titles({ status: 'draft' })).toEqual(['The Ferry'])
    expect(titles({ status: '' })).toEqual(['Lost'])
    expect(titles({ pov: 'Ilka Szabó' })).toEqual(['The Ferry', 'First frost'])
    expect(titles({ thread: 'strike' })).toEqual(['First frost'])
    expect(overviewSections(book, { ...NO_FILTERS, thread: 'strike' })[0]?.total).toBe(2)
    // A section without a part counts its chapters' words.
    expect(overviewSections(book, NO_FILTERS)[1]?.wordCount).toBe(10)
  })
})

describe('filterChoices', () => {
  it('offers what the book uses, once each', () => {
    expect(filterChoices(book)).toEqual({
      statuses: ['draft', 'idea'],
      povs: ['Ilka Szabó'],
      threads: ['main', 'strike']
    })
  })
})
