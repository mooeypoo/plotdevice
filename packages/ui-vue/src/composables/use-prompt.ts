import { ref } from 'vue'

export interface PromptRequest {
  label: string
  value: string
  resolve: (answer: string | null) => void
}

const current = ref<PromptRequest | null>(null)

/** Asks the author for one line of text (a title, a name, a link) in the app's own dialog. `null` means cancelled. */
export function usePrompt() {
  function ask(label: string, value = ''): Promise<string | null> {
    current.value?.resolve(null)
    return new Promise((resolve) => {
      current.value = {
        label,
        value,
        resolve: (answer) => {
          current.value = null
          resolve(answer)
        },
      }
    })
  }
  return { current, ask }
}
