import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiLanguageStore } from '../app/ui-language-store'
import type { EntryKind } from '../app/entry-place'
import { useChromePresentation } from './use-chrome-presentation'

beforeEach(() => setActivePinia(createPinia()))

describe('chrome count presentation', () => {
  it.each([
    ['part', 'בחלק'],
    ['chapter', 'בפרק'],
    ['character', 'בדמות'],
    ['location', 'במקום'],
    ['note', 'בהערה'],
    ['template', 'בתבנית'],
    ['outline', 'במתווה']
  ] satisfies [EntryKind, string][])(
    'translates complete %s sentences with zero, singular and plural counts',
    (kind, suffix) => {
      const presentation = useChromePresentation()
      const language = useUiLanguageStore()
      expect(presentation.documentCount(1, kind)).toBe(`1 word in ${kind}`)
      expect(presentation.documentCount(0, kind)).toBe(`0 words in ${kind}`)
      language.locale = 'he'
      for (const count of [0, 1, 2, 3, 10, 21, 1000]) {
        const formatted = new Intl.NumberFormat('he').format(count)
        expect(presentation.documentCount(count, kind)).toBe(
          `${formatted} ${count === 1 ? 'מילה' : 'מילים'} ${suffix}`
        )
        expect(presentation.wordCount(count)).toBe(`${formatted} ${count === 1 ? 'מילה' : 'מילים'}`)
      }
      language.locale = 'en'
      expect(presentation.formatNumber(1234567)).toBe(new Intl.NumberFormat('en').format(1234567))
    }
  )
})
