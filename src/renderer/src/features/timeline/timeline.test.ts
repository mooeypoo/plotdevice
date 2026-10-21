import { describe, expect, it } from 'vitest'
import type { TimelineChapterDto, TimelineDto } from '../../../../contract/dtos'
import { createTranslator } from '../../../../i18n/translator'
import { chapterLabel, gapsIn, goesBackInTime, readingRows } from './reading-grid'
import {
  axisTicks,
  civilFromDays,
  fittingZoom,
  rowsRange,
  storyRange,
  storyRows
} from './story-axis'

const day = (year: number, month: number, d: number): number =>
  Math.round((Date.UTC(year, month - 1, d) - Date.UTC(1970, 0, 1)) / 86_400_000)

const english = createTranslator('en')
const hebrew = createTranslator('he')

const chapter = (title: string, extra: Partial<TimelineChapterDto> = {}): TimelineChapterDto => ({
  path: `${title}.md`,
  title,
  threads: [],
  characters: [],
  date: { kind: 'undated' },
  ...extra
})

const dated = (start: number, end = start, precision: 'day' | 'month' | 'year' = 'day') => ({
  kind: 'dated' as const,
  reading: {
    kind: 'date' as const,
    date: { calendar: 'gregorian' as const, ...civilFromDays(start) }
  },
  start,
  end,
  precision
})

const timeline: TimelineDto = {
  calendar: 'gregorian',
  threads: [
    { key: 'main', name: 'Main plot', color: '#4f7cac' },
    { key: 'strike', name: 'The cannery strike' }
  ],
  characters: [{ key: 'ilka.md', name: 'Ilka' }],
  chapters: [
    chapter('Ferry', {
      number: 1,
      partNumber: 1,
      threads: ['main'],
      characters: [{ path: 'ilka.md', pov: true }],
      date: dated(day(1952, 10, 3))
    }),
    chapter('Frost', {
      number: 2,
      partNumber: 1,
      threads: ['main', 'strike'],
      characters: [{ path: 'ilka.md', pov: false }],
      date: dated(day(1952, 10, 1), day(1952, 10, 31), 'month')
    }),
    chapter('Cannery', {
      number: 1,
      partNumber: 2,
      threads: ['strike'],
      date: dated(day(1952, 11, 14))
    }),
    chapter('Café', { number: 2, partNumber: 2, threads: ['strike'] })
  ],
  outside: 0
}

describe('readingRows', () => {
  it('marks where each thread or character is, with POV', () => {
    expect(readingRows(timeline, 'threads', 5).map((row) => row.cells)).toEqual([
      ['in', 'in', 'out', 'out'],
      ['out', 'in', 'in', 'in']
    ])
    expect(readingRows(timeline, 'characters', 5)[0]?.cells).toEqual(['pov', 'in', 'out', 'out'])
  })

  it('finds runs of absence after the first appearance, including at the end', () => {
    expect(gapsIn(['out', 'in', 'out', 'out', 'in', 'out', 'out', 'out'], 2)).toEqual([
      { from: 2, to: 3 },
      { from: 5, to: 7 }
    ])
    expect(gapsIn(['out', 'out', 'in'], 1)).toEqual([])
    expect(readingRows(timeline, 'threads', 2)[0]?.gaps).toEqual([{ from: 2, to: 3 }])
  })
})

describe('goesBackInTime and chapterLabel', () => {
  it('flags a chapter that certainly happens before the dated chapter before it', () => {
    // "October 1952" may include the 3rd, so it isn't flagged after 3 October.
    expect(goesBackInTime(timeline.chapters)).toEqual([false, false, false, false])
    expect(
      goesBackInTime([
        chapter('Later', { date: dated(day(1952, 11, 14)) }),
        chapter('Undated'),
        chapter('Before', { date: dated(day(1952, 10, 1), day(1952, 10, 31), 'month') }),
        chapter('Year', { date: dated(day(1952, 1, 1), day(1952, 12, 31), 'year') })
      ])
    ).toEqual([false, false, true, false])
    expect(chapterLabel(timeline.chapters[2] as TimelineChapterDto)).toBe('II·1')
    expect(chapterLabel(chapter('Loose', { number: 3 }))).toBe('3')
  })
})

describe('story axis', () => {
  it('places dated chapters as bars, stacking overlaps into lanes', () => {
    const [main] = storyRows(timeline, 'threads')
    expect(main?.bars.map((bar) => [bar.title, bar.lane])).toEqual([
      ['Frost', 0],
      ['Ferry', 1]
    ])
    expect(main?.lanes).toBe(2)
    expect(storyRows(timeline, 'characters')[0]?.bars.find((bar) => bar.pov)?.title).toBe('Ferry')
    // The characters' bars span October only; the strike's November chapter isn't on those rows.
    expect(rowsRange(storyRows(timeline, 'characters'))).toEqual({
      start: day(1952, 10, 1),
      end: day(1952, 10, 31)
    })
  })

  it('fits the story to the width, and spaces ticks by zoom', () => {
    const range = storyRange(timeline)
    expect(range).toEqual({ start: day(1952, 10, 1), end: day(1952, 11, 14) })
    expect(fittingZoom(range ?? { start: 0, end: 0 }, 1200)).toBe('day')
    expect(fittingZoom({ start: 0, end: 51 }, 760)).toBe('week')
    const days = axisTicks('gregorian', day(1952, 10, 1), day(1952, 10, 9), 36, english.t)
    expect(days.map((tick) => tick.label)).toEqual(['Oct 1952', '3', '5', '7', '9'])
    // About fifteen months in 800 pixels: months, with some scrolling, not years.
    expect(fittingZoom({ start: 0, end: 456 }, 800)).toBe('month')
    const months = axisTicks('gregorian', day(1952, 10, 1), day(1953, 1, 31), 2, english.t)
    expect(months.map((tick) => tick.label)).toEqual(['Oct 1952', 'Nov', 'Dec', '1953'])
    expect(axisTicks('day-count', -3, 20, 8, english.t).map((tick) => tick.label)).toEqual([
      'Day 0',
      'Day 10',
      'Day 20'
    ])
  })

  it('localizes tick labels without moving ticks or changing chronological order', () => {
    const start = day(1952, 10, 1)
    const end = day(1953, 1, 31)
    const en = axisTicks('gregorian', start, end, 2, english.t)
    const he = axisTicks('gregorian', start, end, 2, hebrew.t)
    expect(he.map((tick) => tick.label)).toEqual(['אוק׳ 1952', 'נוב׳', 'דצמ׳', '1953'])
    expect(he.map(({ day, major }) => ({ day, major }))).toEqual(
      en.map(({ day, major }) => ({ day, major }))
    )
    expect(axisTicks('day-count', -3, 20, 8, hebrew.t).map((tick) => tick.label)).toEqual([
      'יום 0',
      'יום 10',
      'יום 20'
    ])
    expect(
      axisTicks('gregorian', -902149, -901784, 0.5, hebrew.t).map((tick) => tick.label)
    ).toContain('500 לפנה״ס')
  })

  it('converts day numbers back to dates, before 1970 and BCE', () => {
    expect(civilFromDays(day(1952, 10, 3))).toEqual({ year: 1952, month: 10, day: 3 })
    expect(civilFromDays(0)).toEqual({ year: 1970, month: 1, day: 1 })
    expect(civilFromDays(-719528)).toEqual({ year: 0, month: 1, day: 1 })
  })
})
