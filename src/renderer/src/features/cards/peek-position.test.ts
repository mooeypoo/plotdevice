import { describe, expect, it } from 'vitest'
import { peekPosition } from './peek-position'

const link = { left: 100, right: 160, top: 200, bottom: 220 }
const viewport = { width: 1200, height: 800, rtl: false }

describe('peekPosition', () => {
  it('opens below the link, aligned to its inline-start edge', () => {
    expect(peekPosition(link, viewport)).toEqual({
      left: '100px',
      top: '226px',
      maxHeight: '420px'
    })
    // In Hebrew the inline-start edge is the link's right: the card's right edge meets it.
    expect(
      peekPosition({ ...link, left: 700, right: 760 }, { ...viewport, rtl: true })
    ).toMatchObject({ left: '400px', top: '226px' })
  })

  it('opens above a link near the bottom with its bottom edge at the link, whatever its height', () => {
    // Regression: a short card used to be placed as if it were 420px tall, far above its link.
    expect(peekPosition({ ...link, top: 700, bottom: 720 }, viewport)).toEqual({
      left: '100px',
      bottom: '106px',
      maxHeight: '420px'
    })
  })

  it('stays inside the window and shrinks when neither side has full room', () => {
    expect(peekPosition({ ...link, left: 1100, right: 1150 }, viewport).left).toBe('832px')
    expect(peekPosition({ ...link, left: 10, right: 40 }, { ...viewport, rtl: true }).left).toBe(
      '8px'
    )
    // Neither side fits 420px: the roomier side wins, and the card shrinks to fit it.
    const cramped = peekPosition({ ...link, top: 300, bottom: 320 }, { ...viewport, height: 600 })
    expect(cramped).toEqual({ left: '100px', bottom: '306px', maxHeight: '286px' })
  })
})
