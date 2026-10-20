import { describe, expect, it } from 'vitest'
import { isolate } from './isolate'

describe('isolate', () => {
  it('wraps text in FSI and PDI', () => {
    expect(isolate('יעל')).toBe('⁨יעל⁩')
    expect(`${isolate('Aunt Bea')} & ${isolate('יעל')}`).toBe('⁨Aunt Bea⁩ & ⁨יעל⁩')
  })
})
