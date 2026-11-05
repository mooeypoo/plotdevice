import { catalogs, createTranslator } from '@plotdevice/i18n'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useApi } from '../api'
import { usePreferences } from '../composables/use-preferences'

const translate = createTranslator(catalogs)

/** The author's settings, and the interface's words in their language. */
export const useSettingsStore = defineStore('settings', () => {
  const { preferences, saveFailed, update } = usePreferences(useApi())
  const locale = computed(() => preferences.value?.locale ?? 'en')
  const t = (key: string, ...params: (string | number)[]): string => translate(locale.value, key, ...params)
  /** Words written into the author's files, in the book's language ("he-IL" reads as Hebrew), not the interface's. */
  const tIn = (language: string, key: string, ...params: (string | number)[]): string =>
    translate(language.split('-')[0] ?? 'en', key, ...params)
  return { preferences, saveFailed, update, locale, t, tIn }
})
