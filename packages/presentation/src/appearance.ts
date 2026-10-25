import type { ThemePreference } from '@plotdevice/contracts'

export type Theme = 'light' | 'dark'

/** The theme actually shown: an explicit choice wins; "system" follows the operating system. */
export function effectiveTheme(preference: ThemePreference, systemIsDark: boolean): Theme {
  if (preference === 'system') return systemIsDark ? 'dark' : 'light'
  return preference
}
