import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('../../src/renderer/src/app/global.css', import.meta.url)),
  'utf8'
)

/** The hex colour tokens declared in a block of CSS. */
function tokens(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/giu)].flatMap((match) =>
      match[1] === undefined || match[2] === undefined ? [] : [[match[1], match[2]] as const]
    )
  )
}

const dark = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme')))
const light = new Map([
  ...dark,
  ...tokens(css.slice(css.indexOf('@media (prefers-color-scheme: light)')))
])

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

const GROUNDS = ['--bg', '--panel', '--raised']
/** Text the app sets on its grounds, which must read at 4.5:1 (WCAG AA). */
const TEXT = [
  '--text',
  '--text-strong',
  '--prose',
  '--text-dim',
  '--text-muted',
  '--accent',
  '--ok',
  '--warning',
  '--danger',
  '--link-character',
  '--link-location',
  '--link-note',
  '--link-other',
  '--link-missing'
]

function failures(palette: Map<string, string>): string[] {
  const pairs: [string, string, number][] = [
    ...TEXT.flatMap((text) =>
      GROUNDS.map((ground): [string, string, number] => [text, ground, 4.5])
    ),
    ['--accent-ink', '--accent', 4.5],
    ['--text', '--hover', 4.5],
    ['--text', '--active', 4.5]
  ]
  return pairs.flatMap(([text, ground, minimum]) => {
    const fore = palette.get(text)
    const back = palette.get(ground)
    if (fore === undefined || back === undefined) return [`${text} on ${ground}: missing`]
    const ratio = contrast(fore, back)
    return ratio >= minimum ? [] : [`${text} on ${ground}: ${ratio.toFixed(2)}`]
  })
}

describe('colour tokens', () => {
  it('reads both palettes from the stylesheet', () => {
    expect(dark.size).toBeGreaterThan(30)
    expect(light.get('--bg')).toBe('#f7f4ee')
    expect(dark.get('--bg')).toBe('#141518')
  })

  it('keep every text colour readable on every ground, in the dark theme', () => {
    expect(failures(dark)).toEqual([])
  })

  it('keep every text colour readable on every ground, in the light theme', () => {
    expect(failures(light)).toEqual([])
  })

  it('give the light theme its own value for every colour the dark theme has', () => {
    const lightOnly = tokens(css.slice(css.indexOf('@media (prefers-color-scheme: light)')))
    expect([...dark.keys()].filter((name) => !lightOnly.has(name))).toEqual([])
  })
})
