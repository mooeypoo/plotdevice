/** Writing direction of a paragraph or phrase. */
export type Direction = 'ltr' | 'rtl'

/** How paragraphs without an override get their direction (ADR 0004). */
export type DirectionMode = 'project' | 'auto'

// Hebrew, Arabic, Syriac, Thaana and their presentation forms are strong right-to-left.
const STRONG_RTL = /[֐-׿؀-ࣿיִ-﷿ﹰ-﻿]/u
const MARK = /\p{M}/u
const LETTER = /\p{L}/u
const RTL_LANGUAGES = new Set(['he', 'ar', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug', 'dv'])

/**
 * The direction of the first strong character, the rule browsers use for `dir="auto"`. `null` when the
 * text has only digits, punctuation and spaces.
 */
export function firstStrongDirection(text: string): Direction | null {
  for (const char of text) {
    if (MARK.test(char)) continue
    if (STRONG_RTL.test(char)) return 'rtl'
    if (LETTER.test(char)) return 'ltr'
  }
  return null
}

/**
 * The direction a paragraph shows without an override. An override is written only when the author
 * wants something different from this ("only when needed", ADR 0004).
 */
export function naturalDirection(text: string, mode: DirectionMode, projectDirection: Direction): Direction {
  return mode === 'auto' ? (firstStrongDirection(text) ?? projectDirection) : projectDirection
}

/** The default direction of a language tag such as `he` or `en-GB`. */
export function directionOfLanguage(language: string): Direction {
  return RTL_LANGUAGES.has(language.split('-')[0]?.toLowerCase() ?? '') ? 'rtl' : 'ltr'
}
