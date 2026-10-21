/** How the project counts story time (`calendar` in novel.md). */
export type Calendar = 'gregorian' | 'day-count'

/** A point in story time, as precise as the writer made it. */
export type StoryDate =
  | {
      readonly calendar: 'gregorian'
      readonly year: number
      readonly month?: number
      readonly day?: number
    }
  | { readonly calendar: 'day-count'; readonly day: number }

/** A chapter's `story_date`, read under the project's calendar (see "StoryDate" in docs/file-format.md). */
export type StoryDateReading =
  | { readonly kind: 'undated' }
  | { readonly kind: 'date'; readonly date: StoryDate }
  | { readonly kind: 'range'; readonly from: StoryDate; readonly to: StoryDate }
  | { readonly kind: 'invalid'; readonly issue: StoryDateIssue }

/** An unusable source value and its semantic reason, without presentation language. */
export type StoryDateIssue =
  | {
      readonly reason: 'not-day-number' | 'too-large' | 'not-date' | 'invalid-day'
      readonly value: string
    }
  | { readonly reason: 'invalid-month'; readonly value: string; readonly month: number }

const GREGORIAN = /^([+-]?\d+)(?:-(\d{2})(?:-(\d{2}))?)?$/u
const WHOLE_NUMBER = /^[+-]?\d+$/u

/** Reads a `story_date` value: one date, a list (a range), or nothing (undated). */
export function readStoryDate(value: unknown, calendar: Calendar): StoryDateReading {
  if (value === undefined || value === null) return { kind: 'undated' }
  if (typeof value === 'string' && value.trim() === '') return { kind: 'undated' }

  if (Array.isArray(value)) {
    const dates: StoryDate[] = []
    for (const item of value) {
      const reading = readOne(item, calendar)
      if (reading.kind === 'invalid') return reading
      dates.push(reading.date)
    }
    const sorted = [...dates].sort(compareStoryDates)
    const [from] = sorted
    const to = sorted[sorted.length - 1]
    if (from === undefined || to === undefined) return { kind: 'undated' }
    return sorted.length === 1 ? { kind: 'date', date: from } : { kind: 'range', from, to }
  }
  return readOne(value, calendar)
}

/** Orders dates by when they happen; a less precise date sorts before the more precise ones within it. */
export function compareStoryDates(a: StoryDate, b: StoryDate): number {
  if (a.calendar === 'day-count' || b.calendar === 'day-count') {
    return (a.calendar === 'day-count' ? a.day : 0) - (b.calendar === 'day-count' ? b.day : 0)
  }
  return a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || (a.day ?? 0) - (b.day ?? 0)
}

function readOne(
  value: unknown,
  calendar: Calendar
): Extract<StoryDateReading, { kind: 'date' | 'invalid' }> {
  return calendar === 'day-count' ? readDay(value) : readGregorian(value)
}

function readDay(value: unknown): Extract<StoryDateReading, { kind: 'date' | 'invalid' }> {
  const day =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && WHOLE_NUMBER.test(value.trim())
        ? Number(value.trim())
        : NaN
  if (!Number.isInteger(day)) {
    return invalid({ reason: 'not-day-number', value: String(value) })
  }
  if (!Number.isSafeInteger(day)) return invalid({ reason: 'too-large', value: String(value) })
  return { kind: 'date', date: { calendar: 'day-count', day } }
}

function readGregorian(value: unknown): Extract<StoryDateReading, { kind: 'date' | 'invalid' }> {
  const text =
    typeof value === 'number' && Number.isInteger(value)
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : undefined
  const match = text === undefined ? null : GREGORIAN.exec(text)
  if (text === undefined || match === null) {
    return invalid({ reason: 'not-date', value: String(value) })
  }
  const year = Number(match[1])
  if (!Number.isSafeInteger(year)) return invalid({ reason: 'too-large', value: text })
  const date: { calendar: 'gregorian'; year: number; month?: number; day?: number } = {
    calendar: 'gregorian',
    year
  }
  if (match[2] !== undefined) {
    const month = Number(match[2])
    if (month < 1 || month > 12) return invalid({ reason: 'invalid-month', value: text, month })
    date.month = month
  }
  if (match[3] !== undefined && date.month !== undefined) {
    const day = Number(match[3])
    if (day < 1 || day > daysInMonth(year, date.month)) {
      return invalid({ reason: 'invalid-day', value: text })
    }
    date.day = day
  }
  return { kind: 'date', date }
}

/** Days in a month of the proleptic Gregorian calendar, for any year (including year 0 and before). */
function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return leap ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function invalid(issue: StoryDateIssue): Extract<StoryDateReading, { kind: 'invalid' }> {
  return { kind: 'invalid', issue }
}
