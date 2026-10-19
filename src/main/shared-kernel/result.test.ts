import { describe, expect, expectTypeOf, it } from 'vitest'
import { andThen, err, map, ok, type Result } from './result'

function parsePositive(input: number): Result<number, string> {
  return input > 0 ? ok(input) : err('not positive')
}

describe('Result', () => {
  it('builds successes and failures as plain objects', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 })
    expect(err('nope')).toEqual({ ok: false, error: 'nope' })
  })

  it('narrows on the ok flag', () => {
    const result = parsePositive(2)
    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<number>()
    } else {
      expectTypeOf(result.error).toEqualTypeOf<string>()
    }
  })

  it('maps only successful values', () => {
    expect(map(parsePositive(2), (n) => n * 10)).toEqual(ok(20))
    expect(map(parsePositive(-1), (n) => n * 10)).toEqual(err('not positive'))
  })

  it('chains operations and stops at the first failure', () => {
    const halve = (n: number): Result<number, 'odd'> => (n % 2 === 0 ? ok(n / 2) : err('odd'))

    expect(andThen(parsePositive(4), halve)).toEqual(ok(2))
    expect(andThen(parsePositive(3), halve)).toEqual(err('odd'))
    expect(andThen(parsePositive(-4), halve)).toEqual(err('not positive'))
    expectTypeOf(andThen(parsePositive(4), halve)).toEqualTypeOf<Result<number, string>>()
  })
})
