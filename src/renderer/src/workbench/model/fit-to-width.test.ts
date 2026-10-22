import { describe, expect, it } from 'vitest'
import { fitToWidth } from './fit-to-width'
import type { Layout } from './layout'
import { PRESETS } from './presets'

const write = PRESETS.write // start 280, end 320

describe('fitToWidth', () => {
  it('shows both docks at their sizes when the page has room', () => {
    expect(fitToWidth(write, 1200)).toEqual({
      start: { shown: true, size: 280 },
      end: { shown: true, size: 320 },
      page: 600
    })
  })

  it('shrinks the end dock first, then the start dock, down to their minimum', () => {
    expect(fitToWidth(write, 840)).toMatchObject({
      start: { size: 280 },
      end: { size: 280 },
      page: 280
    })
    expect(fitToWidth(write, 760)).toMatchObject({
      start: { shown: true, size: 240 },
      end: { shown: true, size: 240 },
      page: 280
    })
  })

  it('hides the end dock, then the start dock, to keep the page readable', () => {
    expect(fitToWidth(write, 700)).toMatchObject({
      start: { shown: true },
      end: { shown: false },
      page: 460
    })
    expect(fitToWidth(write, 500)).toMatchObject({
      start: { shown: false },
      end: { shown: false },
      page: 500
    })
  })

  it('does not show collapsed or empty docks', () => {
    const layout: Layout = {
      ...write,
      start: { ...write.start, collapsed: true },
      end: { ...write.end, sections: [], activeSection: null }
    }
    expect(fitToWidth(layout, 1200)).toEqual({
      start: { shown: false, size: 280 },
      end: { shown: false, size: 320 },
      page: 1200
    })
  })

  it('never changes the stored sizes', () => {
    fitToWidth(write, 300)
    expect(write.end.size).toBe(320)
  })
})
