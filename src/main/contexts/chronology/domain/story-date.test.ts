import { describe, expect, it } from 'vitest'
import { readStoryDate } from './story-date'

describe('readStoryDate in the gregorian calendar', () => {
  it.each([
    ['1952-10-03', { year: 1952, month: 10, day: 3 }],
    ['1952-10', { year: 1952, month: 10 }],
    ['1952', { year: 1952 }],
    [1952, { year: 1952 }],
    ['-0500', { year: -500 }],
    ['+12000-03', { year: 12000, month: 3 }],
    ['2000-02-29', { year: 2000, month: 2, day: 29 }]
  ])('reads %j', (value, expected) => {
    expect(readStoryDate(value, 'gregorian')).toEqual({
      kind: 'date',
      date: { calendar: 'gregorian', ...expected }
    })
  })

  it.each([
    ['1952-02-30', 'invalid-day'],
    ['1900-02-29', 'invalid-day'],
    ['1952-13', 'invalid-month'],
    ['1952-00-10', 'invalid-month'],
    ['October 1952', 'not-date'],
    ['1952-1-3', 'not-date'],
    [1952.5, 'not-date'],
    ['9007199254740992', 'too-large']
  ])('rejects %j with a semantic reason and the original value', (value, reason) => {
    const reading = readStoryDate(value, 'gregorian')
    expect(reading).toMatchObject({ kind: 'invalid', issue: { reason, value: String(value) } })
    expect(reading).not.toHaveProperty('message')
  })

  it('preserves the invalid month separately from its source value', () => {
    expect(readStoryDate('1952-13', 'gregorian')).toEqual({
      kind: 'invalid',
      issue: { reason: 'invalid-month', value: '1952-13', month: 13 }
    })
  })
})

describe('readStoryDate in the day-count calendar', () => {
  it.each([
    [14, 14],
    ['14', 14],
    [-3, -3],
    [0, 0]
  ])('reads %j as day %i', (value, day) => {
    expect(readStoryDate(value, 'day-count')).toEqual({
      kind: 'date',
      date: { calendar: 'day-count', day }
    })
  })

  it('rejects dates, text, and numbers too large to work with', () => {
    expect(readStoryDate('1952-10-03', 'day-count').kind).toBe('invalid')
    expect(readStoryDate('day five', 'day-count').kind).toBe('invalid')
    expect(readStoryDate(2 ** 60, 'day-count').kind).toBe('invalid')
  })
})

describe('readStoryDate shapes', () => {
  it('treats a missing or empty value as undated', () => {
    expect(readStoryDate(undefined, 'gregorian')).toEqual({ kind: 'undated' })
    expect(readStoryDate(null, 'gregorian')).toEqual({ kind: 'undated' })
    expect(readStoryDate('  ', 'gregorian')).toEqual({ kind: 'undated' })
  })

  it('reads a list as a range from the earliest to the latest date', () => {
    expect(readStoryDate(['1952-11-21', '1952-11-15', '1952-11'], 'gregorian')).toEqual({
      kind: 'range',
      from: { calendar: 'gregorian', year: 1952, month: 11 },
      to: { calendar: 'gregorian', year: 1952, month: 11, day: 21 }
    })
  })

  it('reads a list of one as a single date', () => {
    expect(readStoryDate([14], 'day-count')).toEqual({
      kind: 'date',
      date: { calendar: 'day-count', day: 14 }
    })
  })

  it('rejects a list with an unusable item', () => {
    expect(readStoryDate(['1952-11-15', 'soon'], 'gregorian').kind).toBe('invalid')
  })
})

describe('locale-independent precision and validation', () => {
  it('retains signed large years and year zero without using Date', () => {
    expect(readStoryDate('+1200000-03', 'gregorian')).toEqual({
      kind: 'date',
      date: { calendar: 'gregorian', year: 1200000, month: 3 }
    })
    expect(readStoryDate('0000-02-29', 'gregorian')).toEqual({
      kind: 'date',
      date: { calendar: 'gregorian', year: 0, month: 2, day: 29 }
    })
  })

  it('distinguishes invalid day numbers from excessive integers', () => {
    expect(readStoryDate('next week', 'day-count')).toEqual({
      kind: 'invalid',
      issue: { reason: 'not-day-number', value: 'next week' }
    })
    expect(readStoryDate(2 ** 60, 'day-count')).toEqual({
      kind: 'invalid',
      issue: { reason: 'too-large', value: String(2 ** 60) }
    })
  })
})
