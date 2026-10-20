import type { Calendar } from '../../domain/story-date'
import { describeStoryDateReading, readStoryDate } from '../../domain/story-date'
import { storySpan, type StorySpan } from '../../domain/story-span'
import type { GetChronologySettings } from './get-chronology-settings'

/** A `story_date` as the timeline needs it. */
export type DatedValue =
  | { readonly kind: 'undated' }
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'dated'; readonly description: string; readonly span: StorySpan }

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
        if (reading.kind === 'undated') return { kind: 'undated' }
        if (reading.kind === 'invalid') return { kind: 'invalid', message: reading.message }
        const span = storySpan(reading)
        return span === undefined
          ? { kind: 'undated' }
          : { kind: 'dated', description: describeStoryDateReading(reading), span }
      })
    }
  }
}
