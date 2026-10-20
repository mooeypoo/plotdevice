import { ref, type Ref } from 'vue'

/** Serializes explicit recovery decisions and retains a created copy's path on later UI failures. */
export function useEntryRecovery(): {
  busy: Ref<boolean>
  error: Ref<string | null>
  recoveredPath: Ref<string | null>
  run(action: () => Promise<boolean>): Promise<boolean>
  clear(): void
} {
  const busy = ref(false)
  const error = ref<string | null>(null)
  const recoveredPath = ref<string | null>(null)
  return {
    busy,
    error,
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
