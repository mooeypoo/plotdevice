import type { Translator } from '../../../i18n/translator'
import type { EntryPlace, EntryPlaceLabel } from '../app/entry-place'
import { isolate } from './isolate'
import { romanNumeral } from './roman-numeral'

/** Formats generated entry positions at the active interface-language boundary. */
export function formatEntryPlaceLabel(
  label: EntryPlaceLabel,
  t: Translator['t'],
  formatNumber: (value: number) => string = String
): string {
  switch (label.type) {
    case 'part':
      return t('entry-place-part', romanNumeral(label.number))
    case 'not-in-sequence':
      return t('entry-place-not-in-sequence')
    case 'chapter':
      return t(
        'entry-place-chapter',
        label.number === undefined ? 'undefined' : formatNumber(label.number)
      )
    case 'part-chapter':
      return label.chapterNumber === undefined
        ? t('entry-place-part', romanNumeral(label.partNumber))
        : t(
            'entry-place-part-chapter',
            romanNumeral(label.partNumber),
            formatNumber(label.chapterNumber)
          )
    case 'unsequenced-part-chapter':
      return t('entry-place-unsequenced-chapter', isolate(label.partTitle))
    case 'unordered':
      return t('entry-place-unordered')
    case 'codex-kind':
      return t(`entry-place-${label.kind}`)
    case 'outline':
      return t('entry-place-outline')
    case 'template':
      return t('entry-place-template')
  }
}

/** Returns the shorter chapter position used in the project breadcrumb. */
export function formatEntryPlaceCrumb(
  label: EntryPlaceLabel,
  t: Translator['t'],
  formatNumber: (value: number) => string = String
): string {
  if (label.type === 'part-chapter') {
    return label.chapterNumber === undefined
      ? t('entry-place-part', romanNumeral(label.partNumber))
      : t('entry-place-chapter', formatNumber(label.chapterNumber))
  }
  if (label.type === 'unsequenced-part-chapter') return t('entry-place-not-in-sequence')
  return formatEntryPlaceLabel(label, t, formatNumber)
}

/** Localizes generated template titles while leaving author-written titles unchanged. */
export function formatEntryPlaceTitle(place: EntryPlace, t: Translator['t']): string {
  if (place.kind !== 'template' || place.templateOf === undefined) return place.title
  return t(`entry-place-template-title-${place.templateOf}`)
}
