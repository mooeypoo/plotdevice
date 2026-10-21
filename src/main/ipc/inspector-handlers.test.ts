import { describe, expect, it, vi } from 'vitest'
import { createInspectorHandlers } from './inspector-handlers'

describe('inspector handlers', () => {
  it('returns semantic no-project failures for vocabulary and date checks', async () => {
    const handlers = createInspectorHandlers(() => undefined)
    const failure = {
      ok: false,
      error: {
        code: 'no-project',
        message: 'No project is open.',
        diagnostic: { reason: 'no-project' }
      }
    }
    expect(await handlers.getVocabulary()).toEqual(failure)
    expect(await handlers.checkStoryDate(['1952'])).toEqual(failure)
  })

  it('rejects malformed date requests semantically without invoking the query', async () => {
    const checkStoryDate = vi.fn(() => Promise.resolve({ kind: 'undated' } as const))
    const handlers = createInspectorHandlers(() => ({
      getVocabulary: () => Promise.resolve({ statuses: [], threads: [], calendar: 'gregorian' }),
      checkStoryDate
    }))
    for (const args of [[null], ['a'.repeat(501)], ['1952', 'extra']]) {
      expect(await handlers.checkStoryDate(args)).toEqual({
        ok: false,
        error: {
          code: 'invalid-request',
          message: 'The request was not understood.',
          diagnostic: { reason: 'invalid-request' }
        }
      })
    }
    expect(checkStoryDate).not.toHaveBeenCalled()
    expect(await handlers.checkStoryDate(['1952'])).toEqual({
      ok: true,
      value: { kind: 'undated' }
    })
  })
})
