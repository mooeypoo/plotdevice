import { describe, expect, it } from 'vitest'
import { OwnWrites } from './own-writes'

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text)

describe('OwnWrites', () => {
  it('recognizes the bytes the app wrote, and nothing else', () => {
    const log = new OwnWrites()
    log.expectWrite('/book/a.md', bytes('mine'))
    expect(log.isOwnWrite('/book/a.md', bytes('mine'))).toBe(true)
    expect(log.isOwnWrite('/book/a.md', bytes('theirs'))).toBe(false)
    expect(log.isOwnWrite('/book/b.md', bytes('mine'))).toBe(false)
  })

  it('recognizes the app moving a file away', () => {
    const log = new OwnWrites()
    log.expectRemoval('/book/a.md')
    expect(log.isOwnRemoval('/book/a.md')).toBe(true)
    expect(log.isOwnRemoval('/book/b.md')).toBe(false)
  })

  it('forgets after a while, so a later outside edit with the same text still counts', () => {
    let now = 0
    const log = new OwnWrites(() => now)
    log.expectWrite('/book/a.md', bytes('mine'))
    now = 11_000
    expect(log.isOwnWrite('/book/a.md', bytes('mine'))).toBe(false)
  })
})
