import { computed } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'

/** Formats recent-project timestamps in the interface language, keeping the local timezone. */
export function useRecentProjectDates() {
  const language = useUiLanguageStore()
  const formatter = computed(
    () => new Intl.DateTimeFormat(language.locale, { dateStyle: 'medium' })
  )

  function formatDate(isoDate: string): string {
    const date = new Date(isoDate)
    return Number.isNaN(date.getTime()) ? '' : formatter.value.format(date)
  }

  return { formatDate }
}
