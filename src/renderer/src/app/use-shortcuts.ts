import { onBeforeUnmount, onMounted } from 'vue'

/** A keyboard shortcut: `mod` is Ctrl on Linux and Windows. */
export interface Shortcut {
  readonly key: string
  readonly mod?: boolean
  readonly shift?: boolean
  /** False when the browser should also handle the key, such as dismissing a popover on Escape. */
  readonly preventDefault?: boolean
  readonly run: () => void
}

/** Registers window-level shortcuts while the calling component is mounted. */
export function useShortcuts(shortcuts: readonly Shortcut[]): void {
  const onKeyDown = (event: KeyboardEvent): void => {
    for (const shortcut of shortcuts) {
      const mod = event.ctrlKey || event.metaKey
      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        mod === (shortcut.mod ?? false) &&
        event.shiftKey === (shortcut.shift ?? false)
      ) {
        if (shortcut.preventDefault !== false) event.preventDefault()
        shortcut.run()
        return
      }
    }
  }
  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
