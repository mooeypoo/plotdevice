/**
 * Every colour in the app, in one place (DESIGN_SYSTEM.md is the authority for these values).
 * Components use only the generated `--color-*` CSS variables, never hex values, so a palette can be
 * replaced, or later chosen or imported by an author, without touching components.
 */
export type ColorToken =
  | 'app'
  | 'card'
  | 'page'
  | 'text'
  | 'textSecondary'
  | 'accent'
  | 'onAccent'
  | 'warning'
  | 'focus'
  | 'plotAmber'
  | 'plotPlum'
  | 'plotTerracotta'

export type Palette = Readonly<Record<ColorToken, string>>

export const palettes = {
  light: {
    app: '#F7F5F1',
    card: '#FFFFFF',
    page: '#FFFDF8',
    text: '#27313A',
    textSecondary: '#5E6A75',
    accent: '#1F7A77',
    onAccent: '#FFFFFF',
    warning: '#9C6430',
    focus: '#246FC1',
    plotAmber: '#BB803F',
    plotPlum: '#8C628C',
    plotTerracotta: '#BA7158',
  },
  dark: {
    app: '#191E27',
    card: '#272D38',
    page: '#222831',
    text: '#EAE7E2',
    textSecondary: '#A8B0BC',
    accent: '#64C6BB',
    onAccent: '#191E27',
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
