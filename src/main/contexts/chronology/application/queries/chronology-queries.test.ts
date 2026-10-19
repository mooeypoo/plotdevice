import { describe, expect, it } from 'vitest'
import type { ChronologyRepository } from '../../domain/ports/chronology-repository'
import { createCheckStoryDate } from './check-story-date'
import { createGetChronologySettings } from './get-chronology-settings'

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
