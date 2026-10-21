import { computed, shallowRef } from 'vue'
import { useUiLanguageStore } from '../app/ui-language-store'
import { formatErrorNotice, type ErrorNotice } from './error-format'

/** Retains semantic source state while preserving existing writable text presentation surfaces. */
export function useErrorNotice() {
  const language = useUiLanguageStore()
  const source = shallowRef<ErrorNotice>(null)
  const message = computed({
    get: () => formatErrorNotice(source.value, language.t),
    set: (value: string | null) => {
      source.value = value
    }
  })
  return { source, message }
}
