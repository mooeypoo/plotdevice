import { describe, expect, it } from 'vitest'
import { isOnAnyDisplay, validateWindowState } from './window-state'

const state = {
  version: 1,
  bounds: { x: -1200, y: 50, width: 1200, height: 800 },
  maximized: true
}

describe('validateWindowState', () => {
  it('accepts valid settings, including negative display coordinates', () => {
    expect(validateWindowState(state)).toEqual({ ok: true, value: state })
  })

  it.each([
    null,
    [],
    {},
    { ...state, version: 2 },
    { ...state, maximized: 'true' },
    { ...state, maximized: undefined },
    { ...state, bounds: { ...state.bounds, x: '0' } },
    { ...state, bounds: { ...state.bounds, y: 0.5 } },
    { ...state, bounds: { ...state.bounds, x: Infinity } },
    { ...state, bounds: { ...state.bounds, width: 0 } },
    { ...state, bounds: { ...state.bounds, height: -1 } },
    { ...state, bounds: { ...state.bounds, width: NaN } }
  ])('rejects malformed settings: %j', (value) => {
    expect(validateWindowState(value)).toMatchObject({
      ok: false,
      error: { code: 'invalid-window-state' }
    })
  })
})

describe('isOnAnyDisplay', () => {
  const primary = { x: 0, y: 0, width: 1920, height: 1080 }
  const displays = [primary, { x: -1280, y: -200, width: 1280, height: 1024 }]

  it('accepts a window on a non-primary display, including negative coordinates', () => {
    expect(isOnAnyDisplay(state.bounds, displays)).toBe(true)
  })

  it('accepts partially visible windows and windows spanning displays', () => {
    expect(isOnAnyDisplay({ x: 1919, y: 100, width: 1200, height: 800 }, displays)).toBe(true)
    expect(isOnAnyDisplay({ x: -400, y: 100, width: 1200, height: 800 }, displays)).toBe(true)
  })

  it('rejects a window on a disconnected monitor or with no current displays', () => {
    expect(isOnAnyDisplay(state.bounds, [primary])).toBe(false)
    expect(isOnAnyDisplay(state.bounds, [])).toBe(false)
  })

  it.each([
    { x: 1920, y: 0, width: 1200, height: 800 },
    { x: 100, y: 1080, width: 1200, height: 800 },
    { x: -2480, y: 0, width: 1200, height: 800 },
    { x: 0, y: -800, width: 1200, height: 800 }
  ])('rejects windows merely touching a display edge: %j', (bounds) => {
    expect(isOnAnyDisplay(bounds, displays)).toBe(false)
  })
})
