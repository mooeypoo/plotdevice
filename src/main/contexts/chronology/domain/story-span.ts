import type { StoryDate, StoryDateReading } from './story-date'

/** How precisely a date is known: a whole year, a month, or a day. */
export type Precision = 'year' | 'month' | 'day'

/**
 * A date or range as days on one axis, from `start` to `end` inclusive. Gregorian dates count
 * days from 1 January 1970 (proleptic, so year 0 and earlier work); day-count dates are their day.
 * `precision` is the least precise end: "October 1952" covers the whole month, at month precision.
 */
export interface StorySpan {
  readonly start: number
  readonly end: number
  readonly precision: Precision
}

/** The span of a reading, or `undefined` for an undated or invalid one. */
export function storySpan(reading: StoryDateReading): StorySpan | undefined {
  if (reading.kind === 'date') return spanOf(reading.date)
  if (reading.kind !== 'range') return undefined
  const from = spanOf(reading.from)
  const to = spanOf(reading.to)
  return {
    start: from.start,
    end: to.end,
    precision: lessPrecise(from.precision, to.precision)
  }
}

function spanOf(date: StoryDate): StorySpan {
  if (date.calendar === 'day-count') return { start: date.day, end: date.day, precision: 'day' }
  const { year, month, day } = date
  if (month === undefined) {
    return {
      start: daysFromCivil(year, 1, 1),
      end: daysFromCivil(year + 1, 1, 1) - 1,
      precision: 'year'
    }
  }
  if (day === undefined) {
    const next = month === 12 ? daysFromCivil(year + 1, 1, 1) : daysFromCivil(year, month + 1, 1)
    return { start: daysFromCivil(year, month, 1), end: next - 1, precision: 'month' }
  }
  const at = daysFromCivil(year, month, day)
  return { start: at, end: at, precision: 'day' }
}

const RANK: Readonly<Record<Precision, number>> = { day: 0, month: 1, year: 2 }

function lessPrecise(a: Precision, b: Precision): Precision {
  return RANK[a] >= RANK[b] ? a : b
}

/**
 * Days since 1970-01-01 for a proleptic Gregorian date, for any year. (Howard Hinnant's
 * `days_from_civil`, with floor division so negative years work.)
 */
export function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yearOfEra = y - era * 400
  const monthIndex = (month + 9) % 12
  const dayOfYear = Math.floor((153 * monthIndex + 2) / 5) + day - 1
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146097 + dayOfEra - 719468
}
