import type { AreaRegion } from './vocabulary'

/** Dock inline sizes; the end dock's default is today's outline width. */
export const DOCK_SIZE = { min: 240, max: 720, start: 280, end: 320 } as const
/** Bottom shelf block sizes. */
export const SHELF_SIZE = { min: 120, max: 480, default: 200 } as const
/** The narrowest the page may become; docks shrink and collapse first. */
export const MIN_PAGE_INLINE_SIZE = 280
/** Read-only splits beside the writable editor. */
export const SPLITS = { max: 2, minShare: 0.2, maxShare: 0.8, defaultShare: 0.5 } as const
/** Keyboard resizing step, matching today's panel resizing. */
export const RESIZE_STEP = 20

/** The allowed size range of an area. */
export function sizeBounds(region: AreaRegion): { readonly min: number; readonly max: number } {
  return region === 'bottom' ? SHELF_SIZE : DOCK_SIZE
}

/** Rounds `value` and keeps it within the area's range. */
export function clampSize(region: AreaRegion, value: number): number {
  const { min, max } = sizeBounds(region)
  return Math.round(Math.min(max, Math.max(min, value)))
}

/** Keeps a split's share within its range. */
export function clampShare(value: number): number {
  return Math.min(SPLITS.maxShare, Math.max(SPLITS.minShare, value))
}
