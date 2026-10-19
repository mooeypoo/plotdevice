import { describe, expect, expectTypeOf, it } from 'vitest'
import { domainError, type DomainError } from './domain-error'

describe('DomainError', () => {
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
