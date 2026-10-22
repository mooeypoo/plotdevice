import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Whether the command palette is open, and where focus goes back when it closes. */
export const usePaletteStore = defineStore('palette', () => {
  const open = ref(false)
  let returnTo: HTMLElement | null = null

  function show(): void {
    if (open.value) return
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    open.value = true
  }

  /** Closes the palette; focus returns where it was unless a command moved it on purpose. */
  function close(options: { readonly restoreFocus?: boolean } = { restoreFocus: true }): void {
    open.value = false
    if (options.restoreFocus === true) returnTo?.focus()
    returnTo = null
  }

  return { open, show, close }
})
