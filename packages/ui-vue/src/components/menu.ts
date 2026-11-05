import type { IconName } from './AppIcon.vue'

export interface MenuItem {
  key: string
  label: string
  run: () => void
  disabled?: boolean
  /** Starts a new group, with a divider before it. */
  group?: string
  /** A keyboard shortcut, shown beside the label. */
  hint?: string
  /** An icon before the label, where a picture helps (formatting). */
  icon?: IconName
}

/** Shift+F10, or the keyboard's menu key: the keyboard's right-click. */
export const isMenuKey = (event: KeyboardEvent): boolean => event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')

/**
 * Right-click or Shift+F10 on something with a ⋯ menu opens that same menu (Milestone 17, decision 5),
 * so the ⋯ can stay hidden until hover without hiding the commands.
 */
export function openOwnMenu(event: Event, selector: string): void {
  const button = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLButtonElement>(selector)
  if (!button) return
  event.preventDefault()
  button.click()
}
