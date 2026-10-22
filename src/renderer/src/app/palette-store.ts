import { acceptHMRUpdate, defineStore } from 'pinia'
import { nextTick, ref } from 'vue'

/** Whether the command palette is open, and where focus goes back when it closes. */
export const usePaletteStore = defineStore('palette', () => {
  const open = ref(false)
  let returnTo: HTMLElement | null = null
  /** Where focus was when the palette last opened, for commands that open a box of their own. */
  let origin: HTMLElement | null = null

  function show(): void {
    if (open.value) return
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    origin = returnTo
    open.value = true
  }

  /** Closes the palette and returns focus where it was, as Escape does. */
  function close(): void {
    open.value = false
    returnTo?.focus()
    returnTo = null
  }

  /**
   * Closes the palette, runs a command, and then returns focus where it was only if the command
   * didn't put it somewhere: opening another chapter focuses its editor, but looking a character
   * up in Reference leaves the writer typing where they were.
   */
  async function runAndClose(command: () => unknown): Promise<void> {
    const previous = returnTo
    open.value = false
    returnTo = null
    try {
      await command()
    } finally {
      await nextTick()
      const focused = document.activeElement
      if (focused === null || focused === document.body) previous?.focus()
    }
  }

  return { open, show, close, runAndClose, origin: (): HTMLElement | null => origin }
})

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(usePaletteStore, import.meta.hot))
