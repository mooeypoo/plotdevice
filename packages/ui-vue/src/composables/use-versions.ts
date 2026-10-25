import type { ProjectPath } from '@plotdevice/shared'
import { ref } from 'vue'

const current = ref<{ file: ProjectPath; title: string } | null>(null)

/** Opens the Versions panel for a chapter, page or outline. */
export function useVersions() {
  return {
    current,
    show: (file: ProjectPath, title: string): void => {
      current.value = { file, title }
    },
    close: (): void => {
      current.value = null
    },
  }
}
