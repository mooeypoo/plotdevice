/**
 * The only place the site reads from the app (Milestone 10, decision 2): the colour tokens and the
 * interface's words. An architecture rule keeps it that way.
 */
import { catalogs } from '@plotdevice/i18n'
import { cssVariables, palettes } from '@plotdevice/ui-vue/theme'

const block = (selector: string, palette: (typeof palettes)['light']): string =>
  `${selector}{${Object.entries(cssVariables(palette))
    .map(([name, value]) => `${name}:${value}`)
    .join(';')}}`

/** The app's palettes as CSS variables: Starlight is dark by default and marks light with `data-theme`. */
export const themeCss = `${block(':root', palettes.dark)}${block(":root[data-theme='light']", palettes.light)}`

/**
 * A button or menu label exactly as the app shows it in `lang`, falling back to English. Throws on a
 * key the app doesn't have, so a guide can't name a control that isn't there.
 */
export function uiLabel(lang: string, key: string): string {
  const english = catalogs.en?.[key]
  if (typeof english !== 'string') throw new Error(`The app has no message "${key}" (named by a guide page).`)
  const local = catalogs[lang]?.[key]
  return typeof local === 'string' ? local : english
}
