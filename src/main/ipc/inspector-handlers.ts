import { z } from 'zod'
import type { ApiResult, InspectorVocabularyDto, StoryDateCheckDto } from '../../contract/dtos'
import type { CheckStoryDate } from '../contexts/chronology/application/queries/check-story-date'
import type { GetInspectorVocabulary } from '../queries/get-inspector-vocabulary'

/** The inspector's per-project use cases. */
export interface InspectorUseCases {
  readonly getVocabulary: GetInspectorVocabulary
  readonly checkStoryDate: CheckStoryDate
  /** Describes a reading in words ("3 October 1952"). */
  readonly describeStoryDate: (reading: Awaited<ReturnType<CheckStoryDate>>) => string
}

/** The inspector API as plain functions of untrusted arguments. */
export interface InspectorHandlers {
  getVocabulary(): Promise<ApiResult<InspectorVocabularyDto>>
  checkStoryDate(args: readonly unknown[]): Promise<ApiResult<StoryDateCheckDto>>
}

const noProject: ApiResult<never> = {
  ok: false,
  error: { code: 'no-project', message: 'No project is open.' }
}
const textArgs = z.tuple([z.string().max(500)])

/** Builds the inspector handlers for whichever project is open. */
export function createInspectorHandlers(
  current: () => InspectorUseCases | undefined
): InspectorHandlers {
  return {
    async getVocabulary() {
      const useCases = current()
      if (useCases === undefined) return noProject
      const vocabulary = await useCases.getVocabulary()
      return {
        ok: true,
        value: {
          statuses: [...vocabulary.statuses],
          threads: vocabulary.threads.map((thread) => ({ ...thread })),
          calendar: vocabulary.calendar
        }
      }
    },

    async checkStoryDate(args) {
      const useCases = current()
      if (useCases === undefined) return noProject
      const parsed = textArgs.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          error: { code: 'invalid-request', message: 'The request was not understood.' }
        }
      }
      const reading = await useCases.checkStoryDate(parsed.data[0])
      if (reading.kind === 'undated') return { ok: true, value: { kind: 'undated' } }
      if (reading.kind === 'invalid')
        return { ok: true, value: { kind: 'invalid', message: reading.message } }
      return {
        ok: true,
        value: { kind: reading.kind, description: useCases.describeStoryDate(reading) }
      }
    }
  }
}
