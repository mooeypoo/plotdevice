import { describe, expect, it } from 'vitest'
import { readLinkList, readLinkValue } from './read-link-value'

describe('readLinkValue', () => {
  it('reads a quoted wikilink', () => {
    expect(readLinkValue('[[Part One]]')).toEqual({
      kind: 'link',
      link: { target: 'Part One', embed: false }
    })
  })

  it('recovers an unquoted wikilink, which YAML reads as a list inside a list', () => {
    expect(readLinkValue([['Ilka Szabó']])).toEqual({
      kind: 'link',
      link: { target: 'Ilka Szabó', embed: false },
      recovered: true
    })
  })

  it('recovers an unquoted wikilink with shown text', () => {
    expect(readLinkValue([['Ilka Szabó|Ilka']])).toMatchObject({
      kind: 'link',
      link: { target: 'Ilka Szabó', shownText: 'Ilka' },
      recovered: true
    })
  })

  it('reports a value that is missing', () => {
    expect(readLinkValue(undefined)).toEqual({ kind: 'missing' })
    expect(readLinkValue(null)).toEqual({ kind: 'missing' })
  })

  it.each(['Part One', 42, ['Part One'], { target: 'x' }, '[[]]'])(
    'reports %j as not a link',
    (value) => {
      expect(readLinkValue(value)).toEqual({ kind: 'invalid' })
    }
  )
})

describe('readLinkList', () => {
  it('reads a list of links, a single link as a list of one, and skips invalid items', () => {
    expect(readLinkList(['[[Ilka Szabó]]', '[[Aunt Bea]]']).links.map((l) => l.target)).toEqual([
      'Ilka Szabó',
      'Aunt Bea'
    ])
    expect(readLinkList('[[Aunt Bea]]').links.map((l) => l.target)).toEqual(['Aunt Bea'])
    expect(readLinkList(['[[Ilka Szabó]]', 'not a link'])).toMatchObject({
      links: [{ target: 'Ilka Szabó' }],
      invalidCount: 1
    })
    expect(readLinkList(undefined)).toEqual({ links: [], invalidCount: 0 })
  })
})
