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
      return focusByLetter(event, items, index)
  }
  event.preventDefault()
  items[next]?.focus()
  return true
}

/** Typing a letter focuses the next item whose label starts with it, as native menus do. */
function focusByLetter(event: KeyboardEvent, items: HTMLElement[], index: number): boolean {
  if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return false
  const letter = event.key.toLocaleLowerCase()
  for (let offset = 1; offset <= items.length; offset += 1) {
    const item = items[(index + offset) % items.length]
    const label = (item?.dataset['label'] ?? item?.textContent ?? '').trim().toLocaleLowerCase()
    if (label.startsWith(letter)) {
      event.preventDefault()
      item?.focus()
      return true
    }
  }
  return false
}
