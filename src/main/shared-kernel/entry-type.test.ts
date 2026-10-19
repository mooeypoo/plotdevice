import { describe, expect, it } from 'vitest'
import { classifyEntryType } from './entry-type'

describe('classifyEntryType', () => {
  it.each(['part', 'chapter', 'character', 'location', 'note', 'scene'] as const)(
    'recognizes %s',
    (type) => {
      expect(classifyEntryType(type)).toEqual({ kind: 'typed', type })
    }
  )

  it('treats a missing type as untyped', () => {
    expect(classifyEntryType(undefined)).toEqual({ kind: 'untyped' })
  })

  it('keeps an unknown type so the app can show it', () => {
    expect(classifyEntryType('spaceship')).toEqual({ kind: 'untyped', rawType: 'spaceship' })
  })

  it('keeps non-string values as text', () => {
    expect(classifyEntryType(42)).toEqual({ kind: 'untyped', rawType: '42' })
    expect(classifyEntryType(['chapter'])).toEqual({ kind: 'untyped', rawType: '["chapter"]' })
  })

  it('is exact about spelling', () => {
    expect(classifyEntryType('Chapter')).toEqual({ kind: 'untyped', rawType: 'Chapter' })
  })
})
