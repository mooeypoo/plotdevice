import { describe, expect, it } from 'vitest'
import { choiceFor, linkChoices } from './link-choices'

const choices = linkChoices([
  { name: 'Aunt Bea', path: 'characters/Aunt Bea.md', type: 'character' },
  { name: 'Marrow', path: 'characters/Marrow.md', type: 'character' },
  { name: 'Marrow', path: 'locations/Marrow.md', type: 'location' },
  { name: 'Noël', path: 'characters/Noël.md', type: 'character' }
])

describe('linkChoices', () => {
  it('uses the name, or the path when the name is shared, in NFC', () => {
    expect(choices.map((choice) => choice.target)).toEqual([
      'Aunt Bea',
      'characters/Marrow',
      'locations/Marrow',
      'Noël'
    ])
  })
})

describe('choiceFor', () => {
  it('finds the choice a written link means', () => {
    expect(choiceFor(choices, 'aunt bea')?.path).toBe('characters/Aunt Bea.md')
    expect(choiceFor(choices, 'Marrow/../x')).toBeUndefined()
    expect(choiceFor(choices, 'locations/Marrow')?.path).toBe('locations/Marrow.md')
    expect(choiceFor(choices, 'Noël')?.path).toBe('characters/Noël.md')
  })
})
