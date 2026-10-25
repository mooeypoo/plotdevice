import { describe, expect, it } from 'vitest'
import en from './messages/en.json'
import he from './messages/he.json'
import { catalogs, createTranslator, uiDirection } from './translator'

describe('translate', () => {
  const translate = createTranslator({
    en: { greeting: 'Hello, $1', chapters: '{{PLURAL:$1|One chapter|$1 chapters}}', 'only-english': 'Only in English' },
    he: { greeting: 'שלום, $1', chapters: '{{PLURAL:$1|פרק אחד|שני פרקים|$1 פרקים}}' },
  })

  it('fills parameters', () => {
    expect(translate('he', 'greeting', 'יעל')).toBe('שלום, יעל')
  })

  it.each([
    [1, 'פרק אחד'],
    [2, 'שני פרקים'],
    [7, '7 פרקים'],
  ])('uses Hebrew plural forms (one, two, other): %i → %s', (count, expected) => {
    expect(translate('he', 'chapters', count)).toBe(expected)
  })

  it('falls back to English when a Hebrew message is missing', () => {
    expect(translate('he', 'only-english')).toBe('Only in English')
  })
})

describe('the real catalogs', () => {
  const keys = (messages: Record<string, unknown>): string[] => Object.keys(messages).filter((k) => k !== '@metadata').sort()

  it('have the same keys in English and Hebrew', () => {
    expect(keys(he)).toEqual(keys(en))
  })

  it('translate every key into Hebrew, except the product name', () => {
    const untranslated = keys(en).filter((key) => key !== 'app-name' && catalogs.he?.[key] === catalogs.en?.[key])
    expect(untranslated).toEqual([])
  })

  it('work through the facade', () => {
    expect(createTranslator(catalogs)('he', 'app-version', '0.1.0')).toBe('גרסה 0.1.0')
  })
})

describe('uiDirection', () => {
  it.each([
    ['he', 'rtl'],
    ['en', 'ltr'],
  ])('%s → %s', (locale, direction) => {
    expect(uiDirection(locale)).toBe(direction)
  })
})
