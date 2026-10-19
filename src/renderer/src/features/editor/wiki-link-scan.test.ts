import { describe, expect, it } from 'vitest'
import { createLinkKindLookup, findWikiLinks } from './wiki-link-scan'

describe('findWikiLinks', () => {
  it('finds a plain link, labelled by its target', () => {
    const text = 'at [[Marrow]] now'
    const [link] = findWikiLinks(text)
    expect(link).toMatchObject({ from: 3, to: 13, target: 'Marrow', embed: false })
    expect(text.slice(link?.labelFrom, link?.labelTo)).toBe('Marrow')
  })

  it('labels a link with shown text by that text', () => {
    const text = '[[Ilka Szabó|Ilka]] saw'
    const [link] = findWikiLinks(text)
    expect(link?.target).toBe('Ilka Szabó')
    expect(text.slice(link?.labelFrom, link?.labelTo)).toBe('Ilka')
  })

  it('separates the target from a heading', () => {
    expect(findWikiLinks('[[Marrow#Mill|the mill]]')[0]?.target).toBe('Marrow')
  })

  it('finds embeds and several links on a line, with an offset', () => {
    const links = findWikiLinks('![[Marrow]] and [[Aunt Bea]]', 100)
    expect(links.map((link) => [link.target, link.embed, link.from])).toEqual([
      ['Marrow', true, 100],
      ['Aunt Bea', false, 116]
    ])
  })

  it('ignores unbalanced brackets', () => {
    expect(findWikiLinks('[[open and [single] ]]')).toEqual([])
  })
})

describe('createLinkKindLookup', () => {
  const kindOf = createLinkKindLookup([
    { name: 'Ilka Szabó', type: 'character' },
    { name: 'Marrow', type: 'character' },
    { name: 'Marrow', type: 'location' },
    { name: 'Noe\u0308l', type: 'character' },
    { name: 'Research', type: 'note' },
    { name: 'Loose thoughts' }
  ])

  it('gives the target file’s type, case- and normalization-insensitively', () => {
    expect(kindOf('ilka szabó')).toBe('character')
    expect(kindOf('No\u00EBl')).toBe('character')
    expect(kindOf('notes/Research')).toBe('note')
    expect(kindOf('Research.md')).toBe('note')
  })

  it('marks names shared by different types, untyped files, and missing ones', () => {
    expect(kindOf('Marrow')).toBe('ambiguous')
    expect(kindOf('Loose thoughts')).toBe('untyped')
    expect(kindOf('Part Nine')).toBe('missing')
  })
})
