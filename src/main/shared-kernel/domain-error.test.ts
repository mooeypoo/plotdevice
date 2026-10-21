import { describe, expect, expectTypeOf, it } from 'vitest'
import { domainError, type DomainError } from './domain-error'

describe('DomainError', () => {
  it('keeps semantic reasons and parameters through serialization', () => {
    const error = domainError('write-failed', 'Legacy detail', {
      reason: 'file-write-failed',
      path: 'יעל.md',
      detail: 'ENOSPC'
    })
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      code: 'write-failed',
      message: 'Legacy detail',
      diagnostic: { reason: 'file-write-failed', path: 'יעל.md', detail: 'ENOSPC' }
    })
  })
  it('is plain data that survives serialization unchanged', () => {
    const error = domainError('reserved-name', 'CON is reserved on Windows.')

    expect(error).toEqual({ code: 'reserved-name', message: 'CON is reserved on Windows.' })
    expect(error).not.toBeInstanceOf(Error)
    expect(JSON.parse(JSON.stringify(error))).toEqual(error)
  })

  it('keeps the literal error code in its type', () => {
    expectTypeOf(domainError('empty', 'Name is empty.')).toEqualTypeOf<DomainError<'empty'>>()
  })
})
