import type { LinkTarget } from '@plotdevice/presentation'
import { ref } from 'vue'

export interface LinkRequest {
  resolve: (target: LinkTarget | null) => void
}

const current = ref<LinkRequest | null>(null)

/** Asks the author what a card should link to: a chapter, character, place or note. `null` means cancelled. */
export function useLinkPicker() {
  function pick(): Promise<LinkTarget | null> {
    current.value?.resolve(null)
    return new Promise((resolve) => {
      current.value = {
        resolve: (target) => {
          current.value = null
          resolve(target)
        },
      }
    })
  }
  return { current, pick }
}
