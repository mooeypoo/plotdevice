import { describe, expect, it } from 'vitest'
import { readChronologySettings } from './chronology-settings'

describe('readChronologySettings', () => {
  it('reads the calendar and threads', () => {
    expect(
      readChronologySettings({
        calendar: 'day-count',
        threads: [
          { key: 'main', name: 'Main plot', color: '#4f7cac' },
          { key: 'strike', name: 'The cannery strike' }
        ]
      })
    ).toEqual({
      calendar: 'day-count',
      threads: [
        { key: 'main', name: 'Main plot', color: '#4f7cac' },
        { key: 'strike', name: 'The cannery strike' }
      ]
    })
  })

  it('defaults to the gregorian calendar and no threads', () => {
    expect(readChronologySettings(undefined)).toEqual({ calendar: 'gregorian', threads: [] })
    expect(readChronologySettings({ calendar: 'lunar' }).calendar).toBe('gregorian')
  })

  it('skips threads it can’t use, and names a thread by its key when it has no name', () => {
    expect(
      readChronologySettings({
        threads: [{ key: 'ok' }, { key: 'has space' }, { name: 'no key' }, 'main', { key: 'ok' }]
      }).threads
    ).toEqual([{ key: 'ok', name: 'ok' }])
  })
})
