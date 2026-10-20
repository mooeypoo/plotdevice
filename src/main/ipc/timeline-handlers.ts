import type { ApiResult, TimelineDto } from '../../contract/dtos'
import type { GetTimeline } from '../queries/get-timeline'

/** The timeline's per-project use cases. */
export interface TimelineUseCases {
  readonly getTimeline: GetTimeline
}

/** The timeline API as plain functions. */
export interface TimelineHandlers {
  getTimeline(): Promise<ApiResult<TimelineDto>>
}

/** Builds the timeline handlers for whichever project is open. */
export function createTimelineHandlers(
  current: () => TimelineUseCases | undefined
): TimelineHandlers {
  return {
    async getTimeline() {
      const useCases = current()
      if (useCases === undefined) {
        return { ok: false, error: { code: 'no-project', message: 'No project is open.' } }
      }
      const timeline = await useCases.getTimeline()
      return {
        ok: true,
        value: {
          calendar: timeline.calendar,
          threads: timeline.threads.map((row) => ({ ...row })),
          characters: timeline.characters.map((row) => ({ ...row })),
          chapters: timeline.chapters.map((chapter) => ({
            ...chapter,
            threads: [...chapter.threads],
            characters: chapter.characters.map((character) => ({ ...character })),
            date:
              chapter.date.kind === 'dated'
                ? {
                    kind: 'dated',
                    description: chapter.date.description,
                    ...chapter.date.span
                  }
                : chapter.date
          })),
          outside: timeline.outside
        }
      }
    }
  }
}
