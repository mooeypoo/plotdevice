import { describe, expect, it } from 'vitest'
import { createLinkKindLookup, findWikiLinks } from './wiki-link-scan'

describe('findWikiLinks', () => {
  it('finds a plain link, labelled by its target', () => {
    const text = 'at [[Harbor]] now'
    const [link] = findWikiLinks(text)
    expect(link).toMatchObject({ from: 3, to: 13, target: 'Harbor', embed: false })
    expect(text.slice(link?.labelFrom, link?.labelTo)).toBe('Harbor')
  })

  it('labels a link with shown text by that text', () => {
    const text = '[[Mira Kovač|Mira]] saw'
    const [link] = findWikiLinks(text)
    expect(link?.target).toBe('Mira Kovač')
    expect(text.slice(link?.labelFrom, link?.labelTo)).toBe('Mira')
  })

  it('separates the target from a heading', () => {
    expect(findWikiLinks('[[Harbor#Docks|the docks]]')[0]?.target).toBe('Harbor')
  })

  it('finds embeds and several links on a line, with an offset', () => {
    const links = findWikiLinks('![[Harbor]] and [[Old Tal]]', 100)
    expect(links.map((link) => [link.target, link.embed, link.from])).toEqual([
      ['Harbor', true, 100],
      ['Old Tal', false, 116]
    ])
  })

  it('ignores unbalanced brackets', () => {
    expect(findWikiLinks('[[open and [single] ]]')).toEqual([])
  })
})

describe('createLinkKindLookup', () => {
  const kindOf = createLinkKindLookup([
    { name: 'Mira Kovač', type: 'character' },
    { name: 'Harbor', type: 'character' },
    { name: 'Harbor', type: 'location' },
    { name: 'Zoe\u0308', type: 'character' },
    { name: 'Research', type: 'note' },
    { name: 'Loose thoughts' }
  ])

  it('gives the target file’s type, case- and normalization-insensitively', () => {
    expect(kindOf('mira kovač')).toBe('character')
    expect(kindOf('Zo\u00EB')).toBe('character')
    expect(kindOf('notes/Research')).toBe('note')
    expect(kindOf('Research.md')).toBe('note')
  })

  it('marks names shared by different types, untyped files, and missing ones', () => {
    expect(kindOf('Harbor')).toBe('ambiguous')
    expect(kindOf('Loose thoughts')).toBe('untyped')
    expect(kindOf('Part Nine')).toBe('missing')
  })
})
