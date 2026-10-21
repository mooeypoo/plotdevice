import Banana from 'banana-i18n'
import { describe, expect, it } from 'vitest'
import en from './en.json'
import he from './he.json'
import qqq from './qqq.json'
import { isUiLocale, systemUiLocale, uiDirection } from './locales'
import { createTranslator } from './translator'

describe('bundled localization foundation', () => {
  it('documents and translates every foundation message', () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(qqq).sort()).toEqual(Object.keys(en).sort())
    for (const catalog of [en, he, qqq]) {
      for (const [key, message] of Object.entries(catalog)) {
        if (key !== '@metadata')
          expect(typeof message === 'string' && message.length > 0).toBe(true)
      }
    }
  })

  it('keeps formatter instances independent and changes messages without reloading catalogs', () => {
    const first = createTranslator('en')
    const second = createTranslator('he')
    expect(first.t('view-write')).toBe('Write')
    expect(second.t('view-write')).toBe('כתיבה')
    first.setLocale('he')
    second.setLocale('en')
    expect(first.t('view-write')).toBe('כתיבה')
    expect(second.t('view-write')).toBe('Write')
    expect(first.t('about-detail', '1.2.3')).toContain('גרסה 1.2.3')
  })

  it('supports Banana parameter reordering, English fallback and Hebrew plural forms', () => {
    const banana = new Banana('he', { finalFallback: 'en', wikilinks: false })
    banana.load({ fallback: 'English fallback' }, 'en')
    banana.load(
      {
        reordered: '$2 / $1',
        count: '{{PLURAL:$1|one|two|other}}',
        text: '$1'
      },
      'he'
    )
    expect(banana.i18n('fallback')).toBe('English fallback')
    expect(banana.i18n('reordered', 'first', 'second')).toBe('second / first')
    expect([0, 1, 2, 3, 10, 20, 21, 100, 1.5].map((count) => banana.i18n('count', count))).toEqual([
      'other',
      'one',
      'two',
      'other',
      'other',
      'other',
      'other',
      'other',
      'other'
    ])
    expect(banana.i18n('text', '[[יעל]] <b>name</b>')).toBe('[[יעל]] <b>name</b>')
  })

  it('normalizes supported system tags without treating manuscript language as UI state', () => {
    expect(systemUiLocale(['fr', 'he-IL', 'en'])).toBe('he')
    expect(systemUiLocale(['iw_IL'])).toBe('he')
    expect(systemUiLocale(['en-GB', 'he'])).toBe('en')
    expect(systemUiLocale(['ar'])).toBe('en')
    expect(systemUiLocale([])).toBe('en')
    expect(isUiLocale('he-IL')).toBe(false)
    expect(isUiLocale(null)).toBe(false)
    expect(uiDirection('en')).toBe('ltr')
    expect(uiDirection('he')).toBe('rtl')
  })
})
