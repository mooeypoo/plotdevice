import { describe, expect, it } from 'vitest'
import { choiceFor, linkChoices, markdownLinkPath, resolveWritten } from './link-choices'

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

describe('resolveWritten', () => {
  it('resolves unique names and path forms, and nothing ambiguous', () => {
    expect(resolveWritten(choices, 'Aunt Bea')?.path).toBe('characters/Aunt Bea.md')
    expect(resolveWritten(choices, 'Marrow')).toBeUndefined()
    expect(resolveWritten(choices, 'locations/Marrow')?.path).toBe('locations/Marrow.md')
    expect(resolveWritten(choices, 'No\u00ebl.md')?.path).toBe('characters/Noe\u0308l.md')
    expect(resolveWritten(choices, 'Nobody')).toBeUndefined()
  })
})

describe('markdownLinkPath', () => {
  it('resolves relative addresses from the file they are in', () => {
    expect(markdownLinkPath('../characters/Ilka%20Szab%C3%B3.md', 'manuscript/One.md')).toBe(
      'characters/Ilka Szabó.md'
    )
    expect(markdownLinkPath('Two.md#scene', 'manuscript/One.md')).toBe('manuscript/Two.md')
    expect(markdownLinkPath('../../outside.md', 'manuscript/One.md')).toBeUndefined()
    expect(markdownLinkPath('https://example.com/a.md', 'One.md')).toBeUndefined()
  })
})
