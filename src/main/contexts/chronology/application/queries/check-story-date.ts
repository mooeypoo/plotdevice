import { readStoryDate, type StoryDateReading } from '../../domain/story-date'
import type { GetChronologySettings } from './get-chronology-settings'

/**
 * Reads a `story_date` as the writer typed it, under the project's calendar. A comma-separated
 * list is a range.
 */
export type CheckStoryDate = (text: string) => Promise<StoryDateReading>

/** Builds the `CheckStoryDate` query. */
export function createCheckStoryDate(ports: {
  readonly getSettings: GetChronologySettings
}): CheckStoryDate {
  return async (text) => {
    const { calendar } = await ports.getSettings()
    const items = text
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '')
    return readStoryDate(items.length > 1 ? items : (items[0] ?? ''), calendar)
  }
}
