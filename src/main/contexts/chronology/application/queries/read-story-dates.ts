import { readStoryDate, type Calendar, type StoryDateReading } from '../../domain/story-date'
import { storySpan, type StorySpan } from '../../domain/story-span'
import type { GetChronologySettings } from './get-chronology-settings'

/** A `story_date` as the timeline needs it. */
export type DatedValue =
  | Extract<StoryDateReading, { kind: 'undated' | 'invalid' }>
  | {
      readonly kind: 'dated'
      readonly reading: Extract<StoryDateReading, { kind: 'date' | 'range' }>
      readonly span: StorySpan
    }

/** Reads many `story_date` values at once under the project's calendar, with their spans. */
export type ReadStoryDates = (
  values: readonly unknown[]
) => Promise<{ readonly calendar: Calendar; readonly dates: readonly DatedValue[] }>

/** Builds the `ReadStoryDates` query. */
export function createReadStoryDates(ports: {
  readonly getSettings: GetChronologySettings
}): ReadStoryDates {
  return async (values) => {
    const { calendar } = await ports.getSettings()
    return {
      calendar,
      dates: values.map((value): DatedValue => {
        const reading = readStoryDate(value, calendar)
        if (reading.kind === 'undated' || reading.kind === 'invalid') return reading
        const span = storySpan(reading)
        return span === undefined ? { kind: 'undated' } : { kind: 'dated', reading, span }
      })
    }
  }
}
