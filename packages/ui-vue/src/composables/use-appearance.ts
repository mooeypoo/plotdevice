import type { Preferences } from '@plotdevice/contracts'
import { uiDirection } from '@plotdevice/i18n'
import { effectiveTheme } from '@plotdevice/presentation'
import { onBeforeUnmount, ref, watchEffect, type Ref } from 'vue'
import { applyPalette } from '../theme/apply-palette'
import { palettes } from '../theme/tokens'

/**
 * Keeps the document's language, direction and colours in step with the settings and the system theme.
 * Only attributes and CSS variables change, so nothing on the page is remounted.
 */
export function useAppearance(preferences: Ref<Preferences | null>): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const systemIsDark = ref(media.matches)
  const onChange = (event: MediaQueryListEvent): void => {
    systemIsDark.value = event.matches
  }
  media.addEventListener('change', onChange)
  onBeforeUnmount(() => media.removeEventListener('change', onChange))

  watchEffect(() => {
    const current = preferences.value
    if (!current) return
    const root = document.documentElement
    const theme = effectiveTheme(current.theme, systemIsDark.value)
    applyPalette(root, palettes[theme])
    root.dataset.theme = theme
    root.lang = current.locale
    root.dir = uiDirection(current.locale)
  })
}
