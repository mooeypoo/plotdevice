import { describe, expect, it } from 'vitest'
import { peekPosition } from './peek-position'

const link = { left: 100, right: 160, top: 200, bottom: 220 }
const viewport = { width: 1200, height: 800, rtl: false }

describe('peekPosition', () => {
  it('opens below the link, aligned to its inline-start edge', () => {
    expect(peekPosition(link, viewport)).toEqual({ left: '100px', top: '226px' })
    // In Hebrew the inline-start edge is the link's right: the card's right edge meets it.
    expect(peekPosition({ ...link, left: 700, right: 760 }, { ...viewport, rtl: true })).toEqual({
      left: '400px',
      top: '226px'
    })
  })

  it('flips above a link near the bottom and stays inside the window', () => {
    expect(peekPosition({ ...link, top: 700, bottom: 720 }, viewport).top).toBe('274px')
    expect(peekPosition({ ...link, left: 1100, right: 1150 }, viewport).left).toBe('832px')
    expect(peekPosition({ ...link, left: 10, right: 40 }, { ...viewport, rtl: true }).left).toBe(
      '8px'
    )
  })
})
