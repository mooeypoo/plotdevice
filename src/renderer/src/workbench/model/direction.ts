import { RESIZE_STEP, SHELF_SIZE, sizeBounds } from './sizes'
import type { DockSide } from './vocabulary'

/** The interface's inline direction, read from the computed root direction by the shell. */
export type InlineDirection = 'ltr' | 'rtl'

/** A physical screen edge. Only splitter math uses it; layouts never store one. */
export type PhysicalEdge = 'left' | 'right'

/** The screen edge a dock sits against. */
export function physicalEdge(side: DockSide, direction: InlineDirection): PhysicalEdge {
  return (side === 'start') === (direction === 'ltr') ? 'left' : 'right'
}

/** +1 when moving the pointer rightwards widens the dock, -1 when it narrows it. */
function growthSign(side: DockSide, direction: InlineDirection): 1 | -1 {
  return physicalEdge(side, direction) === 'left' ? 1 : -1
}

/** A dock's size after dragging its splitter by `deltaX` pixels (positive is rightwards). */
export function resizeByPointer(
  startSize: number,
  deltaX: number,
  side: DockSide,
  direction: InlineDirection
): number {
  return startSize + deltaX * growthSign(side, direction)
}

/**
 * A dock's size after a key on its splitter, or `undefined` for keys that don't resize. Arrow
 * keys move the splitter in the direction they point on screen; Home and End go to the limits.
 */
export function resizeByKey(
  size: number,
  key: string,
  side: DockSide,
  direction: InlineDirection
): number | undefined {
  const bounds = sizeBounds(side)
  switch (key) {
    case 'ArrowRight':
      return size + RESIZE_STEP * growthSign(side, direction)
    case 'ArrowLeft':
      return size - RESIZE_STEP * growthSign(side, direction)
    case 'Home':
      return bounds.min
    case 'End':
      return bounds.max
    default:
      return undefined
  }
}

/** The shelf's size after dragging its splitter by `deltaY` pixels (positive is downwards). */
export function resizeShelfByPointer(startSize: number, deltaY: number): number {
  return startSize - deltaY
}

/** The shelf's size after a key on its splitter, or `undefined` for keys that don't resize. */
export function resizeShelfByKey(size: number, key: string): number | undefined {
  switch (key) {
    case 'ArrowUp':
      return size + RESIZE_STEP
    case 'ArrowDown':
      return size - RESIZE_STEP
    case 'Home':
      return SHELF_SIZE.min
    case 'End':
      return SHELF_SIZE.max
    default:
      return undefined
  }
}
