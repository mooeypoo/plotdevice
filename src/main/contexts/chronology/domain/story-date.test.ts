import { describe, expect, it } from 'vitest'
import { describeStoryDateReading, readStoryDate } from './story-date'

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
    ['1952-02-30', 'day'],
    ['1900-02-29', 'day'],
    ['1952-13', 'month'],
    ['1952-00-10', 'month'],
    ['October 1952', 'YYYY'],
    ['1952-1-3', 'YYYY'],
    [1952.5, 'YYYY']
  ])('rejects %j', (value, hint) => {
    const reading = readStoryDate(value, 'gregorian')
    expect(reading.kind).toBe('invalid')
    if (reading.kind === 'invalid') expect(reading.message).toContain(hint)
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

describe('describeStoryDateReading', () => {
  it.each([
    ['1952-10-03', '3 October 1952'],
    ['1952-10', 'October 1952'],
    ['-0500', '500 BCE'],
    ['1952-11-15, 1952-11-21', '15 November 1952 – 21 November 1952']
  ])('describes %s as %s', (text, expected) => {
    const items = text.split(',').map((item) => item.trim())
    expect(
      describeStoryDateReading(readStoryDate(items.length > 1 ? items : text, 'gregorian'))
    ).toBe(expected)
  })

  it('describes day counts and undated values', () => {
    expect(describeStoryDateReading(readStoryDate(14, 'day-count'))).toBe('Day 14')
    expect(describeStoryDateReading(readStoryDate(undefined, 'gregorian'))).toBe('Undated')
  })
})
