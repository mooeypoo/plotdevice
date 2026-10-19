import { describe, expect, it } from 'vitest'
import { linkLabel, linkTarget, namesOfType } from './link-targets'

describe('link helpers', () => {
  it('finds a link’s target and label', () => {
    expect(linkTarget('[[Ilka Szabó|Ilka]]')).toBe('Ilka Szabó')
    expect(linkTarget('[[Marrow#Mill]]')).toBe('Marrow')
    expect(linkTarget('plain text')).toBe('plain text')
    expect(linkLabel('[[Ilka Szabó|Ilka]]')).toBe('Ilka')
    expect(linkLabel('[[Aunt Bea]]')).toBe('Aunt Bea')
  })

  it('lists names of the given types, once each, sorted', () => {
    expect(
      namesOfType(
        [
          { name: 'Noël', type: 'character' },
          { name: 'Marrow', type: 'location' },
          { name: 'Marrow', type: 'character' },
          { name: 'Aunt Bea', type: 'character' },
          { name: 'Loose' }
        ],
        ['character']
      )
    ).toEqual(['Aunt Bea', 'Marrow', 'Noël'])
  })
})
