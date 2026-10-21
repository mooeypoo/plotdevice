import { describe, expect, it } from 'vitest'
import type { StoryDateCheckDto } from '../../../contract/dtos'
import { createTranslator } from '../../../i18n/translator'
import { formatStoryDateReading } from './story-date-format'

const english = createTranslator('en')
const hebrew = createTranslator('he')

describe('story-date presentation', () => {
  it.each([
    [
      { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 10, day: 3 } },
      '3 October 1952',
      '3 באוקטובר 1952'
    ],
    [
      { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 10 } },
      'October 1952',
      'אוקטובר 1952'
    ],
    [{ kind: 'date', date: { calendar: 'gregorian', year: -500 } }, '500 BCE', '500 לפנה״ס'],
    [{ kind: 'date', date: { calendar: 'gregorian', year: 0 } }, '0', '0'],
    [
      { kind: 'date', date: { calendar: 'gregorian', year: 1200000, month: 3 } },
      'March 1200000',
      'מרץ 1200000'
    ],
    [{ kind: 'date', date: { calendar: 'day-count', day: -14 } }, 'Day -14', 'יום -14'],
    [{ kind: 'undated' }, 'Undated', 'ללא תאריך']
  ] satisfies [StoryDateCheckDto, string, string][])(
    'formats structured %j in both locales',
    (reading, en, he) => {
      expect(formatStoryDateReading(reading, english.t)).toBe(en)
      expect(formatStoryDateReading(reading, hebrew.t)).toBe(he)
    }
  )

  it('retains range precision and formats the same cached reading after a switch', () => {
    const reading: StoryDateCheckDto = {
      kind: 'range',
      from: { calendar: 'gregorian', year: 1952, month: 11 },
      to: { calendar: 'gregorian', year: 1953, month: 3, day: 2 }
    }
    const translator = createTranslator('en')
    expect(formatStoryDateReading(reading, translator.t)).toBe('November 1952 – 2 March 1953')
    translator.setLocale('he')
    expect(formatStoryDateReading(reading, translator.t)).toBe('נובמבר 1952 – 2 במרץ 1953')
  })

  it('isolates invalid values in messages without changing the structured source', () => {
    const reading: StoryDateCheckDto = {
      kind: 'invalid',
      issue: { reason: 'not-date', value: 'יעל (next)' }
    }
    const source = JSON.stringify(reading)
    const message = formatStoryDateReading(reading, hebrew.t)
    expect(message).toContain('\u2068יעל (next)\u2069')
    expect(message).toContain('YYYY-MM-DD')
    expect(JSON.stringify(reading)).toBe(source)
  })

  it.each([
    { reason: 'not-day-number', value: 'soon' },
    { reason: 'too-large', value: '9007199254740992' },
    { reason: 'invalid-month', value: '1952-13', month: 13 },
    { reason: 'invalid-day', value: '1952-02-30' }
  ] as const)('formats semantic reason $reason in both languages', (issue) => {
    const reading: StoryDateCheckDto = { kind: 'invalid', issue }
    const en = formatStoryDateReading(reading, english.t)
    const he = formatStoryDateReading(reading, hebrew.t)
    expect(en).toContain(issue.value)
    expect(he).toContain(issue.value)
    expect(he).not.toBe(en)
    expect(en).not.toContain('date-error-')
    expect(he).not.toContain('date-error-')
  })
})
