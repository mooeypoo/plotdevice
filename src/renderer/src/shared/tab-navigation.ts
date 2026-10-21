/** Moves focus and activates a horizontal tab with arrows, Home or End. */
export function navigateTabs(event: KeyboardEvent): void {
  const list = event.currentTarget
  if (!(list instanceof HTMLElement) || !(event.target instanceof HTMLElement)) return
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('button[role="tab"]:not(:disabled)')]
  const current = event.target.closest('button')
  if (current === null) return
  const index = tabs.indexOf(current)
  if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return
  const direction = getComputedStyle(list).direction === 'rtl' ? -1 : 1
  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = (index + direction + tabs.length) % tabs.length
      break
    case 'ArrowLeft':
      next = (index - direction + tabs.length) % tabs.length
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = tabs.length - 1
      break
    default:
      return
  }
  event.preventDefault()
  tabs[next]?.focus()
  tabs[next]?.click()
}
