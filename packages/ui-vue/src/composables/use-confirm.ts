import { ref } from 'vue'

export interface ConfirmRequest {
  message: string
  action: string
  resolve: (confirmed: boolean) => void
}

const current = ref<ConfirmRequest | null>(null)

/** Asks the author to confirm something that can't be taken back by a click, such as deleting a section. */
export function useConfirm() {
  function confirm(message: string, action: string): Promise<boolean> {
    current.value?.resolve(false)
    return new Promise((resolve) => {
      current.value = {
        message,
        action,
        resolve: (confirmed) => {
          current.value = null
          resolve(confirmed)
        },
      }
    })
  }
  return { current, confirm }
}
