import { describe, expect, it } from 'vitest'
import { readStoryDate } from './story-date'
import { daysFromCivil, storySpan } from './story-span'

const span = (value: unknown, calendar: 'gregorian' | 'day-count' = 'gregorian'): unknown =>
  storySpan(readStoryDate(value, calendar))

describe('daysFromCivil', () => {
  it('counts days from 1970, before and after, across leap years', () => {
    expect(daysFromCivil(1970, 1, 1)).toBe(0)
    expect(daysFromCivil(1952, 10, 3)).toBe(-6299)
    expect(daysFromCivil(2000, 3, 1) - daysFromCivil(2000, 2, 28)).toBe(2)
    expect(daysFromCivil(1900, 3, 1) - daysFromCivil(1900, 2, 28)).toBe(1)
    expect(daysFromCivil(0, 1, 1)).toBe(-719528)
    expect(daysFromCivil(-500, 1, 1) - daysFromCivil(-501, 1, 1)).toBe(365)
  })
})

describe('storySpan', () => {
  it('spans a day, a month, or a year, at that precision', () => {
    expect(span('1952-10-03')).toEqual({ start: -6299, end: -6299, precision: 'day' })
    expect(span('1952-10')).toEqual({ start: -6301, end: -6271, precision: 'month' })
    expect(span(1952)).toEqual({
      start: daysFromCivil(1952, 1, 1),
      end: daysFromCivil(1952, 12, 31),
      precision: 'year'
    })
  })

  it('spans a range from its first to its last day, as precise as its vaguest end', () => {
    expect(span(['1952-11-21', '1952-11-15'])).toEqual({
      start: daysFromCivil(1952, 11, 15),
      end: daysFromCivil(1952, 11, 21),
      precision: 'day'
    })
    expect(span(['1952-11', '1952-12-24'])).toMatchObject({ precision: 'month' })
  })

  it('uses day numbers in a day-count project, and has no span when undated', () => {
    expect(span(-4, 'day-count')).toEqual({ start: -4, end: -4, precision: 'day' })
    expect(span(undefined)).toBeUndefined()
    expect(span('1952-02-30')).toBeUndefined()
  })
})
