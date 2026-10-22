import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../../../i18n/translator'
import type { UnorderedReasonDto } from '../../../../contract/dtos'
import {
  clashDescription,
  describeUnorderedReason,
  formatWordCount,
  romanNumeral,
  statusColor
} from './binder-labels'

const en = createTranslator('en')
const he = createTranslator('he')

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

describe('formatWordCount', () => {
  it('keeps zero as a dash and formats nonzero values with the supplied UI locale', () => {
    const formatNumber = (value: number): string => new Intl.NumberFormat('he').format(value)
    expect(formatWordCount(0, formatNumber)).toBe('—')
    expect(formatWordCount(1234567, formatNumber)).toBe(formatNumber(1234567))
  })
})

describe('describeUnorderedReason', () => {
  it('explains each reason briefly', () => {
    expect(describeUnorderedReason('missing-order', en.t)).toBe('needs an order')
    expect(describeUnorderedReason('part-not-found', en.t)).toBe('part not found')
  })

  it.each([
    'missing-order',
    'no-part',
    'part-not-a-link',
    'part-not-found',
    'part-ambiguous'
  ] satisfies UnorderedReasonDto[])('localizes %s without modifying the reason', (reason) => {
    const english = describeUnorderedReason(reason, en.t)
    const hebrew = describeUnorderedReason(reason, he.t)
    expect(hebrew).not.toBe(english)
    expect(hebrew).toMatch(/[\u0590-\u05ff]/u)
    expect(hebrew).not.toMatch(/placement-|\$\d/u)
  })
})

describe('clashDescription', () => {
  it('names the chapters that share the order', () => {
    const a = {
      path: 'a',
      title: 'Café Ñandú',
      order: 2,
      wordCount: 0,
      duplicateOrder: true,
      pov: [],
      threads: []
    }
    const b = {
      path: 'b',
      title: 'Duplicate order',
      order: 2,
      wordCount: 0,
      duplicateOrder: true,
      pov: [],
      threads: []
    }
    const c = {
      path: 'c',
      title: 'Shapes',
      order: 3,
      wordCount: 0,
      duplicateOrder: false,
      pov: [],
      threads: []
    }
    expect(clashDescription(a, [a, b, c], en.t)).toBe(
      'Shares order 2 with “\u2068Duplicate order\u2069”.'
    )
    expect(clashDescription(c, [a, b, c], en.t)).toBeUndefined()
    const mixed = { ...b, title: 'יעל <img src=x> (draft)' }
    const second = { ...b, path: 'second', title: 'עוד פרק / next' }
    const siblings = [a, mixed, second, c]
    const before = JSON.stringify(siblings)
    const english = clashDescription(a, siblings, en.t)
    const hebrew = clashDescription(a, siblings, he.t)
    expect(english).toContain('\u2068יעל <img src=x> (draft)\u2069')
    expect(hebrew).toContain('\u2068יעל <img src=x> (draft)\u2069')
    expect(hebrew).toContain('\u2068עוד פרק / next\u2069')
    expect(hebrew).not.toContain('Shares order')
    expect(hebrew).not.toMatch(/\$\d|placement-/u)
    expect(hebrew?.indexOf(mixed.title)).toBeLessThan(hebrew?.indexOf(second.title) ?? 0)
    expect(JSON.stringify(siblings)).toBe(before)
  })
})
