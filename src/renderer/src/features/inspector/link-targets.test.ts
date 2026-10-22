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
          { name: 'Noël', path: 'characters/Noël.md', type: 'character' },
          { name: 'Marrow', path: 'locations/Marrow.md', type: 'location' },
          { name: 'Marrow', path: 'characters/Marrow.md', type: 'character' },
          { name: 'Aunt Bea', path: 'characters/Aunt Bea.md', type: 'character' },
          { name: 'Loose', path: 'Loose.md' }
        ],
        ['character']
      )
    ).toEqual(['Aunt Bea', 'Marrow', 'Noël'])
  })

  it('sorts suggestion names using the selected locale', () => {
    const targets = [
      { name: 'שירה', path: 'characters/שירה.md', type: 'character' },
      { name: 'Ari', path: 'characters/Ari.md', type: 'character' },
      { name: 'דוד', path: 'characters/דוד.md', type: 'character' },
      { name: 'Bea', path: 'characters/Bea.md', type: 'character' }
    ]
    expect(namesOfType(targets, ['character'], new Intl.Collator('en').compare)).toEqual([
      'Ari',
      'Bea',
      'דוד',
      'שירה'
    ])
    expect(namesOfType(targets, ['character'], new Intl.Collator('he').compare)).toEqual([
      'דוד',
      'שירה',
      'Ari',
      'Bea'
    ])
  })
})
