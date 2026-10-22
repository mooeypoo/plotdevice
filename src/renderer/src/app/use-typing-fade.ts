import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { useWritingPreferencesStore } from './writing-preferences-store'

/** Keys that write text, rather than move, select or run a command. */
function writes(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  return event.key.length === 1 || ['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key)
}

/** Whether `target` is inside the prose editor. */
function inProse(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.cm-content') !== null
}

/**
 * Fades the panels while the writer types in the prose, when they have asked for it; any pointer
 * movement or press, or focus leaving the prose, brings them back.
 */
export function useTypingFade(): Ref<boolean> {
  const preferences = useWritingPreferencesStore()
  const fading = ref(false)

  const keydown = (event: KeyboardEvent): void => {
    if (preferences.fadeWhileTyping && writes(event) && inProse(event.target)) fading.value = true
  }
  const wake = (): void => {
    fading.value = false
  }
  const focusin = (event: FocusEvent): void => {
    if (!inProse(event.target)) fading.value = false
  }

  onMounted(() => {
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('pointermove', wake, true)
    document.addEventListener('pointerdown', wake, true)
    document.addEventListener('focusin', focusin, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', keydown, true)
    document.removeEventListener('pointermove', wake, true)
    document.removeEventListener('pointerdown', wake, true)
    document.removeEventListener('focusin', focusin, true)
  })
  return fading
}
