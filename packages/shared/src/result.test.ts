import { describe, expect, it } from 'vitest'
import { err, mapResult, ok } from './result'

describe('Result', () => {
  it('maps a success', () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual({ ok: true, value: 6 })
  })

  it('passes a failure through untouched', () => {
    const failure = err('missing-file')
    expect(mapResult(failure, () => 'never')).toBe(failure)
  })
})
