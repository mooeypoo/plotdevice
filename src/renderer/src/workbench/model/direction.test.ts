import { describe, expect, it } from 'vitest'
import {
  physicalEdge,
  resizeByKey,
  resizeByPointer,
  resizeShelfByKey,
  resizeShelfByPointer
} from './direction'

describe('physicalEdge', () => {
  it('mirrors the docks with the interface direction', () => {
    expect(physicalEdge('start', 'ltr')).toBe('left')
    expect(physicalEdge('end', 'ltr')).toBe('right')
    expect(physicalEdge('start', 'rtl')).toBe('right')
    expect(physicalEdge('end', 'rtl')).toBe('left')
  })
})

describe('resizeByPointer', () => {
  it.each([
    // A dock grows when its splitter moves away from the dock's own edge.
    ['start', 'ltr', 40, 360],
    ['start', 'rtl', 40, 280],
    ['end', 'ltr', 40, 280],
    ['end', 'rtl', 40, 360]
  ] as const)('%s dock in %s, pointer +%ipx → %ipx', (side, direction, deltaX, expected) => {
    expect(resizeByPointer(320, deltaX, side, direction)).toBe(expected)
  })

  it('matches today’s end-panel resizing in both directions', () => {
    // use-outline-width.ts: width + (startX - x) * (rtl ? -1 : 1)
    const legacy = (width: number, deltaX: number, rtl: boolean): number =>
      width + -deltaX * (rtl ? -1 : 1)
    for (const deltaX of [-60, -1, 0, 7, 120]) {
      expect(resizeByPointer(320, deltaX, 'end', 'ltr')).toBe(legacy(320, deltaX, false))
      expect(resizeByPointer(320, deltaX, 'end', 'rtl')).toBe(legacy(320, deltaX, true))
    }
  })
})

describe('resizeByKey', () => {
  it.each([
    ['end', 'ltr', 'ArrowLeft', 340],
    ['end', 'ltr', 'ArrowRight', 300],
    ['end', 'rtl', 'ArrowLeft', 300],
    ['end', 'rtl', 'ArrowRight', 340],
    ['start', 'ltr', 'ArrowRight', 340],
    ['start', 'ltr', 'ArrowLeft', 300],
    ['start', 'rtl', 'ArrowLeft', 340],
    ['start', 'rtl', 'ArrowRight', 300]
  ] as const)('%s dock in %s: %s → %ipx', (side, direction, key, expected) => {
    expect(resizeByKey(320, key, side, direction)).toBe(expected)
  })

  it('goes to the limits with Home and End and ignores other keys', () => {
    expect(resizeByKey(320, 'Home', 'end', 'rtl')).toBe(240)
    expect(resizeByKey(320, 'End', 'start', 'ltr')).toBe(720)
    expect(resizeByKey(320, 'ArrowUp', 'start', 'ltr')).toBeUndefined()
  })
})

describe('shelf resizing', () => {
  it('grows upwards, independent of direction', () => {
    expect(resizeShelfByPointer(200, -30)).toBe(230)
    expect(resizeShelfByKey(200, 'ArrowUp')).toBe(220)
    expect(resizeShelfByKey(200, 'ArrowDown')).toBe(180)
    expect(resizeShelfByKey(200, 'Home')).toBe(120)
    expect(resizeShelfByKey(200, 'End')).toBe(480)
    expect(resizeShelfByKey(200, 'ArrowLeft')).toBeUndefined()
  })
})
