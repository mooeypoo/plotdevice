import type { Layout } from './layout'
import { DOCK_SIZE, MIN_PAGE_INLINE_SIZE } from './sizes'
import type { DockSide } from './vocabulary'

/** How a dock is displayed in the available width. */
export interface FittedDock {
  readonly shown: boolean
  readonly size: number
}

/** Displayed dock sizes and the page's remaining width; the stored layout is unchanged. */
export interface FittedLayout {
  readonly start: FittedDock
  readonly end: FittedDock
  readonly page: number
}

const SHRINK_ORDER: readonly DockSide[] = ['end', 'start']
const HIDE_ORDER: readonly DockSide[] = ['end', 'start']

/**
 * Fits the docks beside a page of at least `MIN_PAGE_INLINE_SIZE`. Docks shrink to their minimum
 * first, the end dock before the start dock; then the end dock hides, then the start dock.
 */
export function fitToWidth(layout: Layout, available: number): FittedLayout {
  const docks: Record<DockSide, FittedDock> = {
    start: wanted(layout, 'start'),
    end: wanted(layout, 'end')
  }
  const overflow = (): number =>
    MIN_PAGE_INLINE_SIZE + occupied(docks.start) + occupied(docks.end) - available

  for (const side of SHRINK_ORDER) {
    const excess = overflow()
    if (excess <= 0) break
    const dock = docks[side]
    if (dock.shown) docks[side] = { ...dock, size: Math.max(DOCK_SIZE.min, dock.size - excess) }
  }
  for (const side of HIDE_ORDER) {
    if (overflow() <= 0) break
    docks[side] = { ...docks[side], shown: false }
  }
  return {
    ...docks,
    page: Math.max(0, available - occupied(docks.start) - occupied(docks.end))
  }
}

function wanted(layout: Layout, side: DockSide): FittedDock {
  const area = layout[side]
  return { shown: !area.collapsed && area.sections.length > 0, size: area.size }
}

function occupied(dock: FittedDock): number {
  return dock.shown ? dock.size : 0
}
