import { describe, expect, it } from 'vitest'
import { createInteractionsHandlers } from './interactions-handlers'

describe('interactions handlers', () => {
  it('retains a semantic no-project refusal', async () => {
    expect(await createInteractionsHandlers(() => undefined).getInteractions()).toEqual({
      ok: false,
      error: {
        code: 'no-project',
        message: 'No project is open.',
        diagnostic: { reason: 'no-project' }
      }
    })
  })
})
