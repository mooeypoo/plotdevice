import type { StoryDateCheckDto, StoryDateDto } from '../../../contract/dtos'
import type { MessageKey, Translator } from '../../../i18n/translator'
import { isolate } from './isolate'

const MONTHS = [
  'date-month-1',
  'date-month-2',
  'date-month-3',
  'date-month-4',
  'date-month-5',
  'date-month-6',
  'date-month-7',
  'date-month-8',
  'date-month-9',
  'date-month-10',
  'date-month-11',
  'date-month-12'
] as const satisfies readonly MessageKey[]
const SHORT_MONTHS = [
  'date-month-short-1',
  'date-month-short-2',
  'date-month-short-3',
  'date-month-short-4',
  'date-month-short-5',
  'date-month-short-6',
  'date-month-short-7',
  'date-month-short-8',
  'date-month-short-9',
  'date-month-short-10',
  'date-month-short-11',
  'date-month-short-12'
] as const satisfies readonly MessageKey[]

/** Localizes a Gregorian month name without depending on Date's representable range. */
export function formatStoryMonth(month: number, t: Translator['t'], short = false): string {
  const key = (short ? SHORT_MONTHS : MONTHS)[month - 1]
  if (key === undefined) throw new Error(`Invalid story month: ${String(month)}`)
  return t(key)
}

/** Formats signed proleptic years without grouping or automatic calendar conversion. */
export function formatStoryYear(year: number, t: Translator['t']): string {
  return year < 0 ? t('date-year-bce', String(-year)) : String(year)
}

/** Formats exactly the precision the writer supplied, including large and negative years. */
export function formatStoryDate(date: StoryDateDto, t: Translator['t']): string {
  if (date.calendar === 'day-count') return t('date-day-count', String(date.day))
  const year = formatStoryYear(date.year, t)
  if (date.month === undefined) return year
  const month = formatStoryMonth(date.month, t)
  return date.day === undefined
    ? t('date-month-year', month, year)
    : t('date-full', String(date.day), month, year)
}

/** Localizes cached date readings or semantic validation issues at display time. */
export function formatStoryDateReading(reading: StoryDateCheckDto, t: Translator['t']): string {
  switch (reading.kind) {
    case 'undated':
      return t('date-undated')
    case 'date':
      return formatStoryDate(reading.date, t)
    case 'range':
      return t('date-range', formatStoryDate(reading.from, t), formatStoryDate(reading.to, t))
    case 'invalid': {
      const { issue } = reading
      const value = isolate(issue.value)
      switch (issue.reason) {
        case 'not-day-number':
          return t('date-error-not-day-number', value)
        case 'too-large':
          return t('date-error-too-large', value)
        case 'not-date':
          return t('date-error-not-date', value)
        case 'invalid-month':
          return t('date-error-invalid-month', value, String(issue.month))
        case 'invalid-day':
          return t('date-error-invalid-day', value)
      }
    }
  }
}
