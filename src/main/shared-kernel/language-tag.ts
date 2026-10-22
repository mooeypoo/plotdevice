/** Whether `tag` looks like a BCP 47 language tag (`en`, `he`, `pt-BR`), as novel.md's `language` is. */
export function isLanguageTag(tag: string): boolean {
  return /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/u.test(tag)
}

/** Primary language subtags written right to left. */
const RIGHT_TO_LEFT = new Set(['he', 'ar', 'fa', 'ur', 'yi', 'dv', 'ps', 'syr', 'ckb'])

/** The direction a language is written in. */
export function languageDirection(tag: string): 'ltr' | 'rtl' {
  return RIGHT_TO_LEFT.has(tag.split('-')[0]?.toLowerCase() ?? '') ? 'rtl' : 'ltr'
}
