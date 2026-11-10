import { ref } from 'vue'

export interface PromptChoices {
  label: string
  options: { value: string; label: string }[]
}

export interface PromptRequest {
  label: string
  value: string
  /** One of a few ways to start, shown under the text (Milestone 19); the first is chosen to begin with. */
  choices?: PromptChoices
  /** The text may be left empty: OK then answers `''`, not "cancelled". */
  optional?: boolean
  resolve: (answer: string | null, choice?: string) => void
}

const current = ref<PromptRequest | null>(null)

/** Asks the author for one line of text (a title, a name, a link) in the app's own dialog. `null` means cancelled. */
export function usePrompt() {
  function open(
    label: string,
    value: string,
    choices: PromptChoices | undefined,
    resolve: PromptRequest['resolve'],
    optional = false,
  ): void {
    current.value?.resolve(null)
    current.value = {
      label,
      value,
      ...(choices ? { choices } : {}),
      ...(optional ? { optional } : {}),
      resolve: (answer, choice) => {
        current.value = null
        resolve(answer, choice)
      },
    }
  }

  /** With `optional`, the text may be left empty, answered as `''`; `null` is still "cancelled". */
  function ask(label: string, value = '', optional = false): Promise<string | null> {
    return new Promise((resolve) => open(label, value, undefined, (answer) => resolve(answer), optional))
  }

  /** As `ask`, with a choice beside the text; `null` means cancelled. */
  function askWithChoice(label: string, choices: PromptChoices): Promise<{ text: string; choice: string } | null> {
    return new Promise((resolve) =>
      open(label, '', choices, (answer, choice) =>
        resolve(answer === null ? null : { text: answer, choice: choice ?? choices.options[0]?.value ?? '' }),
      ),
    )
  }

  return { current, ask, askWithChoice }
}
