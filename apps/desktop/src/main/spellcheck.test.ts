import { describe, expect, it } from 'vitest'
import { spellcheckLanguages } from './spellcheck'

const linux = ['en-US', 'en-GB', 'he', 'fr', 'de']

describe('spellcheck languages', () => {
  it('checks a Hebrew book in Hebrew and English', () => {
    expect(spellcheckLanguages('he', 'he', linux)).toEqual(['he', 'en-US'])
  })

  it('matches a regional tag, or falls back to the language', () => {
    expect(spellcheckLanguages('en-GB', 'en', linux)).toEqual(['en-GB', 'en-US'])
    expect(spellcheckLanguages('fr-CA', 'he', linux)).toEqual(['fr', 'he', 'en-US'])
  })

  it('leaves out dictionaries the system lacks', () => {
    expect(spellcheckLanguages('he', 'he', ['en-US'])).toEqual(['en-US'])
    expect(spellcheckLanguages('he', 'en', [])).toEqual([])
  })
})
