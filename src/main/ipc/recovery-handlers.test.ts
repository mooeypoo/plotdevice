import { describe, expect, it, vi } from 'vitest'
import { ok } from '../shared-kernel/result'
import type { RecoverySession } from '../recovery/recovery-session'
import { createRecoveryHandlers } from './recovery-handlers'

const token = 'd7222dae-b791-4c7a-8352-ea661762d2aa'
function setup() {
  const capture = vi.fn<RecoverySession['capture']>().mockReturnValue(ok(token))
  const saveCopy = vi
    .fn<RecoverySession['saveCopy']>()
    .mockResolvedValue({ ok: false, error: { code: 'snapshot-unavailable', message: 'Expired' } })
  const handlers = createRecoveryHandlers(() => ({ capture, saveCopy }))
  return { handlers, capture, saveCopy }
}
describe('recovery handlers', () => {
  it('accepts only bounded capture and copy requests', async () => {
    const test = setup()
    expect(await test.handlers.capture(['notes/A.md', 'version'])).toEqual(ok(token))
    expect(test.capture).toHaveBeenCalledWith('notes/A.md', 'version')
    await test.handlers.saveCopy([token, 'Draft'])
    expect(test.saveCopy).toHaveBeenCalledWith(token, 'Draft')
  })
  it.each(
    [[], ['../escape.md', 'version'], ['/absolute', 'version'], ['notes/A.md', ''], [42, 'v']].map(
      (args) => ({ args })
    )
  )('rejects invalid capture $args', async ({ args }) => {
    const test = setup()
    expect(await test.handlers.capture(args)).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
    expect(test.capture).not.toHaveBeenCalled()
  })
  it.each(
    [[], ['forged', 'text'], [token, 42], [token, 'text', 'extra']].map((args) => ({ args }))
  )('rejects invalid copy $args', async ({ args }) => {
    const test = setup()
    expect(await test.handlers.saveCopy(args)).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
    expect(test.saveCopy).not.toHaveBeenCalled()
  })
  it('rejects both operations with no project and passes failures through', async () => {
    const handlers = createRecoveryHandlers(() => undefined)
    expect(await handlers.capture(['A.md', 'v'])).toMatchObject({
      ok: false,
      error: { code: 'no-project' }
    })
    expect(await handlers.saveCopy([token, 'text'])).toMatchObject({
      ok: false,
      error: { code: 'no-project' }
    })
    expect(await setup().handlers.saveCopy([token, 'text'])).toMatchObject({
      ok: false,
      error: { code: 'snapshot-unavailable' }
    })
  })
})
