/**
 * Every colour in the app, in one place (DESIGN_SYSTEM.md is the authority for these values).
 * Components use only the generated `--color-*` CSS variables, never hex values, so a palette can be
 * replaced, or later chosen or imported by an author, without touching components.
 */
export type ColorToken =
  | 'app'
  | 'card'
  | 'page'
  | 'well'
  | 'text'
  | 'textSecondary'
  | 'accent'
  | 'onAccent'
  | 'mark'
  | 'warning'
  | 'focus'
  | 'plotAmber'
  | 'plotPlum'
  | 'plotTerracotta'

export type Palette = Readonly<Record<ColorToken, string>>

export const palettes = {
  light: {
    app: '#E8E4DC',
    card: '#FFFFFF',
    page: '#F8F6F1',
    well: '#E0DBD0',
    text: '#1D1E23',
    textSecondary: '#5C5B5E',
    accent: '#2C3E63',
    onAccent: '#FFFFFF',
    mark: '#8C6A2C',
    warning: '#844E1E',
    focus: '#2E62B8',
    plotAmber: '#9A6A26',
    plotPlum: '#8C628C',
    plotTerracotta: '#A55D44',
  },
  dark: {
    app: '#101114',
    card: '#222227',
    page: '#1A1A1E',
    well: '#2A2620',
    text: '#E9E2D3',
    textSecondary: '#9C9483',
    accent: '#E0B66E',
    onAccent: '#101114',
    mark: '#B88E45',
    warning: '#E0AB76',
    focus: '#9CBFF8',
    plotAmber: '#E3B77E',
    plotPlum: '#C4A0D2',
    plotTerracotta: '#E4A186',
  },
} as const satisfies Record<'light' | 'dark', Palette>

/** `textSecondary` → `--color-text-secondary`. */
export function cssVariables(palette: Palette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([token, value]) => [`--color-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value]),
  )
}
