import { describe, expect, it } from 'vitest'
import type { ChronologyRepository } from '../../domain/ports/chronology-repository'
import { createCheckStoryDate } from './check-story-date'
import { createGetChronologySettings } from './get-chronology-settings'
import { createReadStoryDates } from './read-story-dates'

function repository(frontmatter: unknown): ChronologyRepository {
  return { readNovelFrontmatter: () => Promise.resolve(frontmatter) }
}

describe('chronology queries', () => {
  it('reads settings from novel.md', async () => {
    const get = createGetChronologySettings({
      repository: repository({ threads: [{ key: 'main', name: 'Main plot' }] })
    })
    expect(await get()).toEqual({
      calendar: 'gregorian',
      threads: [{ key: 'main', name: 'Main plot' }]
    })
  })

  it('checks a typed date under the project calendar, reading commas as a range', async () => {
    const check = createCheckStoryDate({
      getSettings: createGetChronologySettings({ repository: repository({}) })
    })
    expect(await check('1952-10-03')).toMatchObject({ kind: 'date' })
    expect(await check('1952-11-15, 1952-11-21')).toMatchObject({ kind: 'range' })
    expect(await check('')).toEqual({ kind: 'undated' })
    expect(await check('next spring')).toMatchObject({ kind: 'invalid' })
  })

  it('uses the day-count calendar when the project does', async () => {
    const check = createCheckStoryDate({
      getSettings: createGetChronologySettings({
        repository: repository({ calendar: 'day-count' })
      })
    })
    expect(await check('14')).toEqual({ kind: 'date', date: { calendar: 'day-count', day: 14 } })
  })
})

describe('ReadStoryDates', () => {
  it('retains each reading and span, or the semantic issue that prevents it', async () => {
    const read = createReadStoryDates({
      getSettings: createGetChronologySettings({ repository: repository({}) })
    })
    const result = await read(['1952-10', undefined, '1952-02-30', ['1952-11-15', '1952-11-21']])
    expect(result.calendar).toBe('gregorian')
    expect(result.dates).toMatchObject([
      {
        kind: 'dated',
        reading: { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 10 } },
        span: { precision: 'month' }
      },
      { kind: 'undated' },
      { kind: 'invalid', issue: { reason: 'invalid-day', value: '1952-02-30' } },
      {
        kind: 'dated',
        reading: {
          kind: 'range',
          from: { calendar: 'gregorian', year: 1952, month: 11, day: 15 },
          to: { calendar: 'gregorian', year: 1952, month: 11, day: 21 }
        }
      }
    ])
  })
})
