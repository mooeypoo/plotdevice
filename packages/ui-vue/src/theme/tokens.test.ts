import { describe, expect, it } from 'vitest'
import { contrastRatio, paletteProblems } from './contrast'
import { cssVariables, palettes } from './tokens'

describe('contrastRatio (WCAG 2.1)', () => {
  it('matches known values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
  })
})

describe.each(Object.entries(palettes))('the %s palette', (_name, palette) => {
  it('meets WCAG AA for every text and UI pairing', () => {
    expect(paletteProblems(palette)).toEqual([])
  })
})

describe('paletteProblems', () => {
  it('catches a failing colour, which is how a future custom theme would be checked', () => {
    const tooPale = { ...palettes.light, textSecondary: '#9AA3AB' }
    expect(paletteProblems(tooPale).map((p) => p.foreground)).toContain('textSecondary')
  })
})

describe('cssVariables', () => {
  it('names every token as a --color-* custom property', () => {
    expect(cssVariables(palettes.light)['--color-text-secondary']).toBe(palettes.light.textSecondary)
    expect(Object.keys(cssVariables(palettes.dark))).toHaveLength(Object.keys(palettes.dark).length)
  })
})
