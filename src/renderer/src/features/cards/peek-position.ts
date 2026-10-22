import type { ScreenRect } from '../../shared/screen-rect'

/** The peek card's size budget, matching its CSS maximums. */
const CARD = { width: 360, height: 420, gap: 6, margin: 8 } as const

/**
 * Where to place a peek card beside its link: below it, aligned to the link's inline-start edge
 * (its left in English, its right in Hebrew), flipped above or inward to stay on screen.
 */
export function peekPosition(
  link: ScreenRect,
  viewport: { readonly width: number; readonly height: number; readonly rtl: boolean }
): { readonly left: string; readonly top: string } {
  const width = Math.min(CARD.width, viewport.width - 2 * CARD.margin)
  const preferred = viewport.rtl ? link.right - width : link.left
  const left = Math.max(CARD.margin, Math.min(preferred, viewport.width - width - CARD.margin))
  const below = link.bottom + CARD.gap
  const fitsBelow = below + CARD.height <= viewport.height - CARD.margin
  const top = fitsBelow ? below : Math.max(CARD.margin, link.top - CARD.gap - CARD.height)
  return { left: `${String(Math.round(left))}px`, top: `${String(Math.round(top))}px` }
}
