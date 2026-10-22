import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { LinkAt } from '../shared/link-at'
import type { ScreenRect } from '../shared/screen-rect'
import { placeOf } from './entry-owners'
import { useEditorLinks } from './use-editor-links'

/** How long a peek stays after the pointer leaves its link, so the pointer can reach the card. */
export const PEEK_GRACE_MS = 300

/**
 * The one peek card: which entry it shows and the link it belongs to. Peeks are read-only
 * readers (ADR 0018). A pointer peek never takes focus; a keyboard peek moves focus into the card
 * and gives it back when the card closes.
 */
export const usePeekStore = defineStore('peek', () => {
  const path = ref<string | null>(null)
  const anchor = shallowRef<ScreenRect | null>(null)
  /** Whether the card should take focus when it opens (a keyboard peek). */
  const takesFocus = ref(false)
  let returnTo: HTMLElement | null = null
  let closeTimer: ReturnType<typeof setTimeout> | undefined

  function holdOpen(): void {
    if (closeTimer !== undefined) clearTimeout(closeTimer)
    closeTimer = undefined
  }

  function show(target: string, near: ScreenRect, byKeyboard: boolean): void {
    holdOpen()
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    path.value = target
    anchor.value = near
    takesFocus.value = byKeyboard
  }

  function close(options: { readonly restoreFocus?: boolean } = {}): void {
    holdOpen()
    path.value = null
    anchor.value = null
    takesFocus.value = false
    if (options.restoreFocus === true) returnTo?.focus()
    returnTo = null
  }

  /** The pointer left the link or the card: close after a short grace unless it comes back. */
  function endHover(): void {
    if (path.value === null || takesFocus.value) return
    holdOpen()
    closeTimer = setTimeout(() => {
      closeTimer = undefined
      close()
    }, PEEK_GRACE_MS)
  }

  return { path, anchor, takesFocus, show, close, endHover, holdOpen }
})

/** Peeks at links' targets, if they are entries the project lists. */
export function usePeek() {
  const peek = usePeekStore()
  const links = useEditorLinks()

  function peekLink(
    link: LinkAt,
    fromPath: string | undefined,
    near: ScreenRect,
    byKeyboard = false
  ): boolean {
    const target = links.resolveLink(link, fromPath)
    if (target === undefined || placeOf(target) === undefined) return false
    peek.show(target, near, byKeyboard)
    return true
  }

  return { peekLink, endHover: peek.endHover, close: peek.close }
}
