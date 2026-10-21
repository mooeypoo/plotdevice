import { describe, expect, it } from 'vitest'
import { describeFrontmatterValue } from './frontmatter-values'

describe('describeFrontmatterValue', () => {
  it.each([
    [undefined, 'undefined'],
    [null, 'null'],
    [7, '7'],
    ['יעל', '"יעל"'],
    [[undefined, 7], '[null,7]'],
    [{ key: true }, '{"key":true}']
  ])('keeps diagnostic source %j textual', (value, expected) => {
    expect(describeFrontmatterValue(value)).toBe(expected)
  })
})
