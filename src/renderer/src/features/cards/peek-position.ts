import type { ScreenRect } from '../../shared/screen-rect'

/** The peek card's size budget, matching its CSS maximums. */
const CARD = { width: 360, height: 420, gap: 6, margin: 8 } as const

/** CSS for a fixed peek card: a horizontal offset plus either a top or a bottom edge. */
export type PeekPlacement =
  | { readonly left: string; readonly top: string; readonly maxHeight: string }
  | { readonly left: string; readonly bottom: string; readonly maxHeight: string }

const px = (value: number): string => `${String(Math.round(value))}px`

/**
 * Where to place a peek card beside its link: below it, aligned to the link's inline-start edge
 * (its left in English, its right in Hebrew), kept inside the window. When there isn't room below,
 * the card opens above with its bottom edge at the link, so a short card still touches its link.
 */
export function peekPosition(
  link: ScreenRect,
  viewport: { readonly width: number; readonly height: number; readonly rtl: boolean }
): PeekPlacement {
  const width = Math.min(CARD.width, viewport.width - 2 * CARD.margin)
  const preferred = viewport.rtl ? link.right - width : link.left
  const left = px(Math.max(CARD.margin, Math.min(preferred, viewport.width - width - CARD.margin)))
  const roomBelow = viewport.height - CARD.margin - (link.bottom + CARD.gap)
  const roomAbove = link.top - CARD.gap - CARD.margin
  if (roomBelow >= CARD.height || roomBelow >= roomAbove) {
    return {
      left,
      top: px(link.bottom + CARD.gap),
      maxHeight: px(Math.min(CARD.height, roomBelow))
    }
  }
  return {
    left,
    bottom: px(viewport.height - (link.top - CARD.gap)),
    maxHeight: px(Math.min(CARD.height, roomAbove))
  }
}
