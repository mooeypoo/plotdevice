import { ref } from 'vue'

export interface ConfirmRequest {
  message: string
  action: string
  /** A gentler choice offered beside the action, and shown as the one to prefer ("Set aside instead"). */
  instead?: string
  resolve: (choice: boolean | 'instead') => void
}

const current = ref<ConfirmRequest | null>(null)

/** Asks the author to confirm something that can't be taken back by a click, such as deleting a section. */
export function useConfirm() {
  function ask(message: string, action: string, instead?: string): Promise<boolean | 'instead'> {
    current.value?.resolve(false)
    return new Promise((resolve) => {
      current.value = {
        message,
        action,
        ...(instead ? { instead } : {}),
        resolve: (choice) => {
          current.value = null
          resolve(choice)
        },
      }
    })
  }
  const confirm = async (message: string, action: string): Promise<boolean> => (await ask(message, action)) === true
  /** As `confirm`, offering a gentler choice too: `'action'`, `'instead'`, or `null` when cancelled. */
  async function confirmOrInstead(message: string, action: string, instead: string): Promise<'action' | 'instead' | null> {
    const choice = await ask(message, action, instead)
    return choice === true ? 'action' : choice === 'instead' ? 'instead' : null
  }
  return { current, confirm, confirmOrInstead }
}
