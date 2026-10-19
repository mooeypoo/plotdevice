import { describe, expect, it } from 'vitest'
import {
  clashDescription,
  describeUnorderedReason,
  romanNumeral,
  statusColor
} from './binder-labels'

describe('romanNumeral', () => {
  it.each([
    [1, 'I'],
    [3, 'III'],
    [4, 'IV'],
    [9, 'IX'],
    [14, 'XIV'],
    [40, 'XL'],
    [1999, 'MCMXCIX']
  ])('writes %i as %s', (value, expected) => {
    expect(romanNumeral(value)).toBe(expected)
  })

  it('falls back to digits outside the Roman range', () => {
    expect(romanNumeral(0)).toBe('0')
    expect(romanNumeral(4000)).toBe('4000')
  })
})

describe('statusColor', () => {
  it('colors the default statuses, any case, and shares one color for the rest', () => {
    expect(statusColor('draft')).toBe('var(--status-draft)')
    expect(statusColor('Draft')).toBe('var(--status-draft)')
    expect(statusColor('maybe')).toBe('var(--status-other)')
    expect(statusColor(undefined)).toBe('var(--status-none)')
  })
})

describe('describeUnorderedReason', () => {
  it('explains each reason briefly', () => {
    expect(describeUnorderedReason('missing-order')).toBe('needs an order')
    expect(describeUnorderedReason('part-not-found')).toBe('part not found')
  })
})

describe('clashDescription', () => {
  it('names the chapters that share the order', () => {
    const a = { path: 'a', title: 'Café Ñandú', order: 2, wordCount: 0, duplicateOrder: true }
    const b = { path: 'b', title: 'Duplicate order', order: 2, wordCount: 0, duplicateOrder: true }
    const c = { path: 'c', title: 'Shapes', order: 3, wordCount: 0, duplicateOrder: false }
    expect(clashDescription(a, [a, b, c])).toBe('Shares order 2 with “Duplicate order”')
    expect(clashDescription(c, [a, b, c])).toBeUndefined()
  })
})
