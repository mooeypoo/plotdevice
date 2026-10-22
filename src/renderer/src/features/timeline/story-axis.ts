import type { TimelineDto } from '../../../../contract/dtos'
import type { RowMode } from './reading-grid'
import type { Translator } from '../../../../i18n/translator'
import { formatStoryMonth, formatStoryYear } from '../../shared/story-date-format'
import { isolate } from '../../shared/isolate'

/** How much story time fits on screen: pixels per day. */
export type Zoom = 'day' | 'week' | 'month' | 'year'

export const PX_PER_DAY: Readonly<Record<Zoom, number>> = {
  day: 36,
  week: 8,
  month: 2,
  year: 0.2
}

/** A mark on the time axis. `major` ones start a month (day zoom) or a year. */
export interface Tick {
  readonly day: number
  readonly label: string
  readonly major: boolean
}

/** A chapter drawn on a row, from its first day to its last, in a lane so bars never overlap. */
export interface Bar {
  readonly path: string
  readonly title: string
  readonly start: number
  readonly end: number
  readonly precision: 'year' | 'month' | 'day'
  readonly pov: boolean
  readonly lane: number
}

/** A row of the story-order view. */
export interface StoryRow {
  readonly key: string
  readonly name: string
  readonly color?: string
  readonly bars: readonly Bar[]
  readonly lanes: number
}

/** The first and last day of every dated chapter, or `undefined` when none is dated. */
export function storyRange(timeline: TimelineDto): { start: number; end: number } | undefined {
  return rangeOf(
    timeline.chapters.flatMap((chapter) => (chapter.date.kind === 'dated' ? [chapter.date] : []))
  )
}

/** The first and last day of the bars drawn, so a vague date on no row doesn't stretch the axis. */
export function rowsRange(rows: readonly StoryRow[]): { start: number; end: number } | undefined {
  return rangeOf(rows.flatMap((row) => row.bars))
}

function rangeOf(
  spans: readonly { readonly start: number; readonly end: number }[]
): { start: number; end: number } | undefined {
  if (spans.length === 0) return undefined
  return {
    start: Math.min(...spans.map((span) => span.start)),
    end: Math.max(...spans.map((span) => span.end))
  }
}

/**
 * The most detailed zoom that shows the story within about one and a half screens of `width`: a
 * little scrolling reads better than bars too small to tell apart.
 */
export function fittingZoom(range: { start: number; end: number }, width: number): Zoom {
  const days = range.end - range.start + 1
  const zooms: Zoom[] = ['day', 'week', 'month', 'year']
  return zooms.find((zoom) => days * PX_PER_DAY[zoom] <= width * 1.5) ?? 'year'
}

/** Each row's dated chapters as bars, stacked into lanes where they overlap. */
export function storyRows(timeline: TimelineDto, mode: RowMode): StoryRow[] {
  const rows = mode === 'threads' ? timeline.threads : timeline.characters
  return rows.map((row) => {
    const placed = timeline.chapters
      .flatMap((chapter) => {
        if (chapter.date.kind !== 'dated') return []
        const character =
          mode === 'characters'
            ? chapter.characters.find((candidate) => candidate.path === row.key)
            : undefined
        const inRow =
          mode === 'threads' ? chapter.threads.includes(row.key) : character !== undefined
        if (!inRow) return []
        return [
          {
            path: chapter.path,
            title: chapter.title,
            start: chapter.date.start,
            end: chapter.date.end,
            precision: chapter.date.precision,
            pov: character?.pov ?? false
          }
        ]
      })
      .sort((a, b) => a.start - b.start || a.end - b.end)
    const laneEnds: number[] = []
    const bars = placed.map((bar): Bar => {
      let lane = laneEnds.findIndex((end) => end < bar.start)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = bar.end
      return { ...bar, lane }
    })
    return { ...row, bars, lanes: Math.max(1, laneEnds.length) }
  })
}

/** The proleptic Gregorian date of a day counted from 1 January 1970 (Hinnant's `civil_from_days`). */
export function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = days + 719468
  const era = Math.floor(z / 146097)
  const dayOfEra = z - era * 146097
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365
  )
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153)
  const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1
  const month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9
  return { year: yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day }
}

/** The marks for the axis from `start` to `end`, spaced so labels don't crowd. */
export function axisTicks(
  calendar: 'gregorian' | 'day-count',
  start: number,
  end: number,
  pxPerDay: number,
  t: Translator['t'],
  formatNumber: (value: number) => string = String
): Tick[] {
  const ticks: Tick[] = []
  if (calendar === 'day-count') {
    const step =
      [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 5000].find((s) => s * pxPerDay >= 48) ?? 10000
    for (let day = Math.ceil(start / step) * step; day <= end; day += step) {
      ticks.push({
        day,
        label: t('date-day-count', isolate(formatNumber(day))),
        major: day % (step * 5) === 0
      })
    }
    return ticks
  }
  for (let day = start; day <= end; day += 1) {
    const date = civilFromDays(day)
    if (pxPerDay >= 20) {
      // A month's name is wide: day numbers start two days in and leave room between them.
      const every = Math.max(1, Math.ceil(40 / pxPerDay))
      if (date.day === 1) {
        ticks.push({
          day,
          label: t(
            'date-month-year',
            formatStoryMonth(date.month, t, true),
            formatStoryYear(date.year, t)
          ),
          major: true
        })
      } else if (date.day >= 3 && (date.day - 3) % every === 0) {
        ticks.push({ day, label: formatNumber(date.day), major: false })
      }
    } else if (pxPerDay >= 1 && date.day === 1) {
      // The first month shown names its year too, so the axis never starts without one.
      const month = formatStoryMonth(date.month, t, true)
      ticks.push({
        day,
        label:
          date.month === 1
            ? formatStoryYear(date.year, t)
            : ticks.length === 0
              ? t('date-month-year', month, formatStoryYear(date.year, t))
              : month,
        major: date.month === 1
      })
    } else if (pxPerDay < 1 && date.day === 1 && date.month === 1) {
      const every = Math.max(1, Math.ceil(48 / (365 * pxPerDay)))
      if (date.year % every === 0) {
        ticks.push({
          day,
          label: formatStoryYear(date.year, t),
          major: date.year % (every * 5) === 0
        })
      }
    }
  }
  return ticks
}
