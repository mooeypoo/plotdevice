import { describe, expect, it } from 'vitest'
import { directionOfLanguage, firstStrongDirection, naturalDirection } from './text-direction'

describe('firstStrongDirection: what dir="auto" decides', () => {
  it.each([
    ['The letter arrived.', 'ltr'],
    ['יעל קראה את המכתב.', 'rtl'],
    ['Ilka אמרה: "זה לא המטע שלי".', 'ltr'], // starts with a Latin name: auto-detection gets this Hebrew sentence wrong
    ['(1904) — השנה שבה נבנה השער.', 'rtl'], // digits and punctuation are not strong; the Hebrew decides
    ['"שָׁלוֹם", she said.', 'rtl'], // niqqud does not hide the letter it sits on
    ['Noël', 'ltr'],
    ['مرحبا', 'rtl'], // Arabic counts as right-to-left too
  ])('%s → %s', (text, expected) => {
    expect(firstStrongDirection(text)).toBe(expected)
  })

  it('returns null when there is no strong character at all', () => {
    expect(firstStrongDirection('1904 — 2026, 12:30 …')).toBeNull()
    expect(firstStrongDirection('')).toBeNull()
  })
})

describe('naturalDirection: what a paragraph shows without an override', () => {
  it('follows the project language in "project" mode, whatever the text says', () => {
    expect(naturalDirection('The letter arrived.', 'project', 'rtl')).toBe('rtl')
  })

  it('follows the first strong character in "auto" mode', () => {
    expect(naturalDirection('The letter arrived.', 'auto', 'rtl')).toBe('ltr')
  })

  it('falls back to the project direction when the text has no strong character', () => {
    expect(naturalDirection('1904.', 'auto', 'rtl')).toBe('rtl')
  })
})

describe('directionOfLanguage', () => {
  it.each([
    ['he', 'rtl'],
    ['he-IL', 'rtl'],
    ['ar', 'rtl'],
    ['en', 'ltr'],
    ['en-GB', 'ltr'],
    ['', 'ltr'],
  ])('%s → %s', (language, expected) => {
    expect(directionOfLanguage(language)).toBe(expected)
  })
})
