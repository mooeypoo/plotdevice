import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'
import type { UiLanguageDto, UiLocale } from '../../../contract/dtos'
import { uiDirection } from '../../../i18n/locales'
import { createTranslator, type Translator } from '../../../i18n/translator'
import { plotDeviceApi } from './plot-device-api'

/** Reactive interface presentation; switching never touches project/editor stores. */
export const useUiLanguageStore = defineStore('ui-language', () => {
  const locale = ref<UiLocale>('en')
  const notice = ref<UiLanguageDto['notice']>()
  const saveFailed = ref(false)
  const busy = ref(false)
  const translator = computed(() => createTranslator(locale.value))
  let stopListening: (() => void) | undefined

  function apply(settings: UiLanguageDto): void {
    locale.value = settings.locale
    notice.value = settings.notice
    document.documentElement.lang = settings.locale
    document.documentElement.dir = uiDirection(settings.locale)
  }

  const t: Translator['t'] = (key, ...parameters) => translator.value.t(key, ...parameters)

  async function initialize(): Promise<void> {
    stopListening?.()
    const api = plotDeviceApi.current().uiLanguage
    stopListening = api.onChanged(apply)
    apply(await api.get())
  }

  async function change(next: UiLocale): Promise<void> {
    if (busy.value) return
    busy.value = true
    saveFailed.value = false
    try {
      const result = await plotDeviceApi.current().uiLanguage.set(next)
      if (result.ok) apply(result.value)
      else {
        console.error('Interface language could not be saved.', result.error)
        saveFailed.value = true
      }
    } catch (error) {
      console.error('Interface language request failed.', error)
      saveFailed.value = true
    } finally {
      busy.value = false
    }
  }

  onScopeDispose(() => stopListening?.())
  const errorMessage = computed(() => {
    if (saveFailed.value) return t('language-save-failed')
    if (notice.value === 'invalid-settings') return t('language-invalid-settings')
    if (notice.value === 'load-failed') return t('language-load-failed')
    return ''
  })
  return { locale, busy, errorMessage, t, initialize, change }
})

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useUiLanguageStore, import.meta.hot))
