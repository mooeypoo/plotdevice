import { describe, expect, it } from 'vitest'
import { edgeEnabledIndex, nextEnabledIndex, placeList, typeaheadIndex } from './listbox-keys'

const OPTIONS = [
  { value: 'a', label: 'Ilka', disabled: true },
  { value: 'b', label: 'Bea' },
  { value: 'c', label: 'Ilse' },
  { value: 'd', label: 'Isaac' },
  { value: 'e', label: 'אילקה' }
]

describe('listbox keys', () => {
  it('skips disabled options and stops at the ends', () => {
    expect(nextEnabledIndex(OPTIONS, 1, -1)).toBe(1)
    expect(nextEnabledIndex(OPTIONS, 1, 1)).toBe(2)
    expect(edgeEnabledIndex(OPTIONS, false)).toBe(1)
    expect(edgeEnabledIndex(OPTIONS, true)).toBe(4)
    expect(edgeEnabledIndex([{ value: 'x', label: 'X', disabled: true }], false)).toBe(-1)
  })

  it('finds by prefix and cycles on a repeated letter', () => {
    expect(typeaheadIndex(OPTIONS, 'is', 1, 'en')).toBe(3)
    expect(typeaheadIndex(OPTIONS, 'i', 1, 'en')).toBe(2)
    expect(typeaheadIndex(OPTIONS, 'ii', 2, 'en')).toBe(3)
    expect(typeaheadIndex(OPTIONS, 'א', 0, 'he')).toBe(4)
    expect(typeaheadIndex(OPTIONS, 'z', 0, 'en')).toBe(-1)
  })

  it('opens below, or above when the room is there, aligned to the inline start', () => {
    const viewport = { width: 1000, height: 800 }
    const low = { left: 100, right: 300, top: 700, bottom: 730 }
    expect(placeList(low, viewport, false)).toMatchObject({ bottom: 104, left: 100 })
    const high = { left: 100, right: 300, top: 50, bottom: 80 }
    expect(placeList(high, viewport, false)).toMatchObject({ top: 84, left: 100, minWidth: 200 })
    expect(placeList(high, viewport, true)).toMatchObject({ right: 700 })
  })
})
