import { computed } from 'vue'
import type { EntryKind } from '../app/entry-place'
import { useUiLanguageStore } from '../app/ui-language-store'

/** Compares display strings using the selected interface language. */
export type TextComparator = (left: string, right: string) => number

/** Presents UI-locale number/count formatting and text collation without changing stored values. */
export function useChromePresentation() {
  const language = useUiLanguageStore()
  const numbers = computed(() => new Intl.NumberFormat(language.locale))
  const collator = computed(() => new Intl.Collator(language.locale))
  const countKeys = {
    part: 'chrome-count-part',
    chapter: 'chrome-count-chapter',
    character: 'chrome-count-character',
    location: 'chrome-count-location',
    note: 'chrome-count-note',
    template: 'chrome-count-template',
    outline: 'chrome-count-outline'
  } as const

  function formatNumber(value: number): string {
    return numbers.value.format(value)
  }

  function compareText(left: string, right: string): number {
    return collator.value.compare(left, right)
  }

  function documentCount(count: number, kind: EntryKind): string {
    return language.t(countKeys[kind], count, formatNumber(count))
  }

  function wordCount(count: number): string {
    return language.t('chrome-count-words', count, formatNumber(count))
  }

  return { formatNumber, compareText, documentCount, wordCount }
}
