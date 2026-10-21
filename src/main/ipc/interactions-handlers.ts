import type { ApiResult, InteractionsDto } from '../../contract/dtos'
import type { GetInteractions } from '../queries/get-interactions'

/** The interactions view's per-project use cases. */
export interface InteractionsUseCases {
  readonly getInteractions: GetInteractions
}

/** The interactions API as plain functions. */
export interface InteractionsHandlers {
  getInteractions(): Promise<ApiResult<InteractionsDto>>
}

/** Builds the interactions handlers for whichever project is open. */
export function createInteractionsHandlers(
  current: () => InteractionsUseCases | undefined
): InteractionsHandlers {
  return {
    async getInteractions() {
      const useCases = current()
      if (useCases === undefined) {
        return {
          ok: false,
          error: {
            code: 'no-project',
            message: 'No project is open.',
            diagnostic: { reason: 'no-project' }
          }
        }
      }
      const interactions = await useCases.getInteractions()
      return {
        ok: true,
        value: {
          chapters: interactions.chapters.map((chapter) => ({ ...chapter })),
          characters: interactions.characters.map((character) => ({
            ...character,
            chapters: [...character.chapters],
            povChapters: [...character.povChapters]
          })),
          outside: interactions.outside
        }
      }
    }
  }
}
