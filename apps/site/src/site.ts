/**
 * The website's own pages (Milestone 24): their languages, their words, and the addresses outside the
 * site. Each address lives here once, so moving downloads to a sales service later is a one-line change.
 */
import en from './i18n/en.json'
import he from './i18n/he.json'

/** Where the installers are. Today GitHub's releases page (owner, 2026-11-09). */
export const DOWNLOAD = 'https://github.com/mooeypoo/plotdevice/releases'
export const BUY_ME_A_COFFEE = 'https://buymeacoffee.com/mooeypoo'
export const MAKER = { name: 'Moriel Schottlender', href: 'https://moriel.tech' }

/** The site's languages, each by its own name. The order is the order they're offered in. */
export const LANGUAGES = [
  { lang: 'he', name: 'עברית', dir: 'rtl' },
  { lang: 'en', name: 'English', dir: 'ltr' },
] as const
export type Lang = (typeof LANGUAGES)[number]['lang']

/** The sample novel the front page shows, in each language (its folder under samples/). */
export const SAMPLE: Record<Lang, { book: string; chapter: string }> = {
  en: { book: 'the-salt-orchard', chapter: 'manuscript/the-crossing.md' },
  he: { book: 'מטע-המלח', chapter: 'manuscript/המעבר.md' },
}

const catalogs: Record<Lang, Record<string, unknown>> = { en, he }

export const isLang = (value: string | undefined): value is Lang => LANGUAGES.some((language) => language.lang === value)

/**
 * A message in `lang`, falling back to English, with `$1`, `$2`… filled in from `params` (banana style,
 * as in the app). Throws on a key English doesn't have, so a page can't show a missing message.
 */
export function words(lang: Lang, key: string, ...params: string[]): string {
  const english = catalogs.en[key]
  if (typeof english !== 'string' || key.startsWith('@')) throw new Error(`The site has no message "${key}".`)
  const local = catalogs[lang][key]
  const text = typeof local === 'string' ? local : english
  return text.replace(/\$(\d+)/g, (whole, index: string) => params[Number(index) - 1] ?? whole)
}

/**
 * An address on this site in `lang`. English is the default, at the root: `path('en', 'support/')` is
 * `/support/`, and `path('he', 'support/')` is `/he/support/`.
 */
export const path = (lang: Lang, rest = ''): string => (lang === 'en' ? `/${rest}` : `/${lang}/${rest}`)
