import { describe, expect, it } from 'vitest'
import { BOOK_LANGUAGES, isLanguageTag, languageDirection, resolveBookWords } from './book-words'
import { BOOK_LANGUAGE_CHOICES } from '../../contract/book-languages'
import en from './words/en.json'
import he from './words/he.json'
import qqq from './words/qqq.json'

describe('resolveBookWords', () => {
  it('uses English, with no direction, when the book declares no language', () => {
    const words = resolveBookWords(null)
    expect(words).toMatchObject({ declared: null, language: 'en', direction: null })
    expect(words.seeds.statuses).toEqual(['idea', 'outline', 'draft', 'revised', 'final'])
    expect(words.recognized.outline_inbox.write).toBe('Inbox')
  })

  it('uses Hebrew words and right-to-left for a Hebrew book', () => {
    const words = resolveBookWords('he')
    expect(words).toMatchObject({ declared: 'he', language: 'he', direction: 'rtl' })
    expect(words.seeds['untitled-chapter']).toBe('פרק ללא שם')
    expect(words.recognized.outline_inbox).toEqual({
      write: 'רעיונות',
      recognize: ['רעיונות', 'Inbox']
    })
  })

  it('keeps an unsupported language’s direction and uses English words for it', () => {
    expect(resolveBookWords('ar')).toMatchObject({
      declared: 'ar',
      language: 'en',
      direction: 'rtl'
    })
    expect(resolveBookWords('he-IL').language).toBe('he')
  })

  it('writes the writer’s own word and still recognizes the defaults', () => {
    const words = resolveBookWords('en', { outline_inbox: '  Ideas  ' })
    expect(words.recognized.outline_inbox).toEqual({
      write: 'Ideas',
      recognize: ['Ideas', 'Inbox', 'רעיונות']
    })
    expect(resolveBookWords('en', { outline_inbox: ' ' }).recognized.outline_inbox.write).toBe(
      'Inbox'
    )
  })
})

describe('language tags', () => {
  it('accepts BCP 47 tags and knows right-to-left languages', () => {
    expect(isLanguageTag('pt-BR')).toBe(true)
    expect(isLanguageTag('Hebrew')).toBe(false)
    expect(isLanguageTag('he IL')).toBe(false)
    expect(languageDirection('fa')).toBe('rtl')
    expect(languageDirection('fr')).toBe('ltr')
  })
})

describe('book word catalogs', () => {
  const shape = (catalog: unknown): unknown =>
    JSON.parse(JSON.stringify(catalog), (_, value: unknown) =>
      typeof value === 'string' ? '' : value
    )

  it('share the same keys and the same number of statuses in en, he and qqq', () => {
    expect(shape(he)).toEqual(shape(en))
    expect(shape(qqq)).toEqual(shape(en))
  })

  it('give every word a value', () => {
    for (const catalog of [en, he, qqq]) {
      const strings = JSON.stringify(catalog).match(/"(?:[^"\\]|\\.)*"/gu) ?? []
      expect(strings).not.toContain('""')
    }
  })
})

describe('book language choices', () => {
  it('offer exactly the languages the app has words for, with their direction', () => {
    expect(BOOK_LANGUAGE_CHOICES.map((choice) => choice.tag)).toEqual([...BOOK_LANGUAGES])
    for (const choice of BOOK_LANGUAGE_CHOICES) {
      expect(languageDirection(choice.tag)).toBe(choice.direction)
    }
  })
})
