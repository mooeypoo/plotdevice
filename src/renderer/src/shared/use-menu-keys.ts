/** Moves focus between a menu's items with the arrow keys, Home and End. Returns whether it did. */
export function moveMenuFocus(event: KeyboardEvent, menu: HTMLElement): boolean {
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')]
  if (items.length === 0) return false
  const index = items.findIndex((item) => item === document.activeElement)
  let next: number
  switch (event.key) {
    case 'ArrowDown':
      next = (index + 1) % items.length
      break
    case 'ArrowUp':
      next = (index - 1 + items.length) % items.length
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = items.length - 1
      break
    default:
      return false
  }
  event.preventDefault()
  items[next]?.focus()
  return true
}
