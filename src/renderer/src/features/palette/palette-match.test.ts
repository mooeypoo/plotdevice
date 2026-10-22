import { describe, expect, it } from 'vitest'
import { createMatcher } from './palette-match'

const matcher = createMatcher('en')

describe('palette matching', () => {
  it('ranks a prefix, then a word start, then anywhere, then letters in order', () => {
    const items = [
      { title: 'Marrow' },
      { title: 'The Ferry' },
      { title: 'Ferryman' },
      { title: 'Café ferrous' },
      { title: 'F-e-r-r-y' }
    ]
    expect(matcher.filter(items, 'ferr').map((item) => item.title)).toEqual([
      'Ferryman',
      'The Ferry',
      'Café ferrous',
      'F-e-r-r-y'
    ])
  })

  it('ignores case and accents, and matches aliases', () => {
    expect(matcher.rank({ title: 'Café' }, 'cafe')).toBe(0)
    expect(matcher.rank({ title: 'Ilka Szabó', aliases: ['Ilk'] }, 'ilk')).toBe(0)
    expect(matcher.rank({ title: 'Ilka Szabó' }, 'xyz')).toBeUndefined()
  })

  it('ignores niqqud in Hebrew', () => {
    const hebrew = createMatcher('he')
    // שָׁלוֹם with vowel marks matches the bare letters.
    expect(hebrew.rank({ title: 'שָׁלוֹם עליכם' }, 'שלום')).toBe(0)
    expect(hebrew.rank({ title: 'בית שָׁלוֹם' }, 'שלום')).toBe(1)
  })

  it('keeps everything, in order, for an empty query', () => {
    const items = [{ title: 'b' }, { title: 'a' }]
    expect(matcher.filter(items, '  ')).toEqual(items)
  })
})
