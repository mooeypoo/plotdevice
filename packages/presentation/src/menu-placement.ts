/** A box on screen, in viewport pixels. */
export interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Where a menu opens beside its button, in viewport pixels, so nothing hides it: not the window's
 * edge, and not a scrolling area or a bar above it (the menu is fixed to the window, not inside them).
 * Below the button when it fits there, otherwise on the side with more room; a list taller than that
 * room scrolls (`maxHeight`). `align: 'start'` lines its start edge up with the button's, mirrored in
 * right-to-left; it is then nudged inside the window.
 */
export function menuPlacement(
  button: Box,
  menu: { width: number; height: number },
  window: { width: number; height: number },
  options: { align: 'start' | 'end'; rtl: boolean; gap?: number; margin?: number },
): { top: number; left: number; maxHeight: number; above: boolean } {
  const gap = options.gap ?? 6
  const margin = options.margin ?? 8
  const roomBelow = window.height - button.bottom - gap - margin
  const roomAbove = button.top - gap - margin
  const above = menu.height > roomBelow && roomAbove > roomBelow
  const maxHeight = Math.max(0, above ? roomAbove : roomBelow)
  const height = Math.min(menu.height, maxHeight)
  const top = above ? button.top - gap - height : button.bottom + gap
  const towardsRight = (options.align === 'end') !== options.rtl
  const wanted = towardsRight ? button.right - menu.width : button.left
  const left = Math.min(Math.max(wanted, margin), Math.max(margin, window.width - margin - menu.width))
  return { top, left, maxHeight, above }
}
