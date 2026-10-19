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
    expect(readLinkValue([['Mira Kovač']])).toEqual({
      kind: 'link',
      link: { target: 'Mira Kovač', embed: false },
      recovered: true
    })
  })

  it('recovers an unquoted wikilink with shown text', () => {
    expect(readLinkValue([['Mira Kovač|Mira']])).toMatchObject({
      kind: 'link',
      link: { target: 'Mira Kovač', shownText: 'Mira' },
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
    expect(readLinkList(['[[Mira Kovač]]', '[[Old Tal]]']).links.map((l) => l.target)).toEqual([
      'Mira Kovač',
      'Old Tal'
    ])
    expect(readLinkList('[[Old Tal]]').links.map((l) => l.target)).toEqual(['Old Tal'])
    expect(readLinkList(['[[Mira Kovač]]', 'not a link'])).toMatchObject({
      links: [{ target: 'Mira Kovač' }],
      invalidCount: 1
    })
    expect(readLinkList(undefined)).toEqual({ links: [], invalidCount: 0 })
  })
})
