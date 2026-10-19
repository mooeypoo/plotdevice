import { describe, expect, it } from 'vitest'
import { linkKeyType } from './link-key-type'

describe('linkKeyType', () => {
  it('names the type each link key expects', () => {
    expect(linkKeyType('part')).toBe('part')
    expect(linkKeyType('pov')).toBe('character')
    expect(linkKeyType('characters')).toBe('character')
    expect(linkKeyType('location')).toBe('location')
  })

  it('expects nothing of other keys', () => {
    expect(linkKeyType('threads')).toBeUndefined()
    expect(linkKeyType('constructor')).toBeUndefined()
  })
})
