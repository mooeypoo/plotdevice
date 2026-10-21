import { ref, type Ref } from 'vue'
import { useErrorNotice } from '../shared/use-error-notice'
import type { ErrorNotice } from '../shared/error-format'

/** Serializes explicit recovery decisions and retains a created copy's path on later UI failures. */
export function useEntryRecovery(): {
  busy: Ref<boolean>
  error: Ref<string | null>
  errorSource: Ref<ErrorNotice>
  recoveredPath: Ref<string | null>
  run(action: () => Promise<boolean>): Promise<boolean>
  clear(): void
} {
  const busy = ref(false)
  const { message: error, source: errorSource } = useErrorNotice()
  const recoveredPath = ref<string | null>(null)
  return {
    busy,
    error,
    errorSource,
    recoveredPath,
    async run(action) {
      if (busy.value) return false
      busy.value = true
      error.value = null
      try {
        return await action()
      } finally {
        busy.value = false
      }
    },
    clear() {
      error.value = null
      recoveredPath.value = null
    }
  }
}
