import { describe, expect, it } from 'vitest'
import type { DatedValue } from '../contexts/chronology/application/queries/read-story-dates'
import { parseProjectPath } from '../shared-kernel/project-path'
import { createTimelineHandlers } from './timeline-handlers'

describe('timeline handlers', () => {
  it.each([
    {
      kind: 'dated',
      reading: {
        kind: 'range',
        from: { calendar: 'gregorian', year: -500 },
        to: { calendar: 'gregorian', year: 1200000, month: 3 }
      },
      span: { start: -902149, end: 437571106, precision: 'year' }
    },
    {
      kind: 'dated',
      reading: { kind: 'date', date: { calendar: 'day-count', day: -14 } },
      span: { start: -14, end: -14, precision: 'day' }
    },
    { kind: 'invalid', issue: { reason: 'invalid-month', value: '1952-13', month: 13 } },
    { kind: 'undated' }
  ] satisfies DatedValue[])('preserves structured date payload %j over IPC', async (date) => {
    const path = parseProjectPath('Chapter.md')
    if (!path.ok) throw new Error('Invalid fixture path')
    const handlers = createTimelineHandlers(() => ({
      getTimeline: () =>
        Promise.resolve({
          calendar: 'gregorian',
          threads: [],
          characters: [],
          chapters: [
            {
              path: path.value,
              title: 'Chapter',
              threads: [],
              characters: [],
              date
            }
          ],
          outside: 0
        })
    }))
    const result = await handlers.getTimeline()
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected timeline')
    expect(result.value.chapters[0]?.date).toEqual(
      date.kind === 'dated' ? { kind: 'dated', reading: date.reading, ...date.span } : date
    )
    expect(result.value.chapters[0]?.date).not.toHaveProperty('description')
    expect(result.value.chapters[0]?.date).not.toHaveProperty('message')
  })
})
