import { describe, expect, it } from 'vitest'
import en from './messages/en.json'
import he from './messages/he.json'
import qqq from './messages/qqq.json'
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
  const keys = (messages: Record<string, unknown>): string[] =>
    Object.keys(messages)
      .filter((k) => k !== '@metadata')
      .sort()

  it('have the same keys in English and Hebrew', () => {
    expect(keys(he)).toEqual(keys(en))
  })

  // `qqq.json` tells translators what each message is and where it shows (banana-i18n's convention),
  // so a translation tool can show it beside the message.
  it('document every English key for translators, and nothing else', () => {
    expect(keys(qqq)).toEqual(keys(en))
    const thin = Object.entries(qqq).filter(([key, note]) => key !== '@metadata' && (typeof note !== 'string' || note.trim().length < 15))
    expect(thin).toEqual([])
  })

  it('translate every key into Hebrew, except names Hebrew keeps as they are', () => {
    // The product's name, and file formats and a paper size that Hebrew writes the same way (Milestone 22).
    const names = new Set([
      'app-name',
      'export-format-word',
      'export-format-pdf',
      'export-format-markdown',
      'export-paper-a4',
      'dialog-export-pdf',
      'dialog-export-markdown',
    ])
    const untranslated = keys(en).filter((key) => !names.has(key) && catalogs.he?.[key] === catalogs.en?.[key])
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
