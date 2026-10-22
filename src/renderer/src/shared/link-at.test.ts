import { describe, expect, it } from 'vitest'
import { linkAt } from './link-at'

describe('linkAt', () => {
  const line = 'Ilka met [[Aunt Bea|Bea]] near [the mill](../locations/Marrow.md).'

  it('finds the wikilink or markdown link under a position', () => {
    expect(linkAt(line, 100, 100 + 12)).toEqual({ kind: 'wiki', target: 'Aunt Bea' })
    expect(linkAt(line, 100, 100 + 34)).toEqual({
      kind: 'markdown',
      address: '../locations/Marrow.md'
    })
    expect(linkAt(line, 100, 100 + 2)).toBeUndefined()
  })
})
