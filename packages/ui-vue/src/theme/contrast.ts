import type { ColorToken, Palette } from './tokens'

/** WCAG 2.1 contrast ratio between two `#RRGGBB` colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export interface ContrastProblem {
  foreground: ColorToken
  background: ColorToken
  ratio: number
  required: number
}

/** `well` is a surface too: selected rows and segmented controls carry text on it. */
const SURFACES: ColorToken[] = ['app', 'card', 'page', 'well']
/** Text needs 4.5:1 (WCAG AA); focus rings, marks and colour chips need 3:1 (non-text contrast). */
const REQUIREMENTS: [ColorToken, ColorToken[], number][] = [
  ['text', SURFACES, 4.5],
  ['textSecondary', SURFACES, 4.5],
  ['accent', SURFACES, 4.5],
  ['warning', SURFACES, 4.5],
  ['onAccent', ['accent'], 4.5],
  ['focus', SURFACES, 3],
  ['mark', SURFACES, 3],
  ['plotAmber', SURFACES, 3],
  ['plotPlum', SURFACES, 3],
  ['plotTerracotta', SURFACES, 3],
]

/** Every pairing in `palette` that falls short of its WCAG requirement. Empty means the palette is usable. */
export function paletteProblems(palette: Palette): ContrastProblem[] {
  return REQUIREMENTS.flatMap(([foreground, backgrounds, required]) =>
    backgrounds.flatMap((background) => {
      const ratio = contrastRatio(palette[foreground], palette[background])
      return ratio < required ? [{ foreground, background, ratio: Math.round(ratio * 100) / 100, required }] : []
    }),
  )
}
