import { shallowRef } from 'vue'
import type { BoardPosition } from './board-keys'

/** What the writer is dragging on the board. */
export type BoardDragged =
  | { readonly kind: 'beat'; readonly from: BoardPosition }
  | { readonly kind: 'column'; readonly from: number }

/** Where a drop would land: a gap among a column's cards, or among the movable columns. */
export type BoardDropSpot =
  | { readonly kind: 'beat'; readonly column: number; readonly slot: number }
  | { readonly kind: 'column'; readonly slot: number }

/** The gap nearest the pointer along an axis: before the item in its first half, after it in the second. */
export function gapAt(index: number, offset: number, size: number): number {
  return offset < size / 2 ? index : index + 1
}

/**
 * The board's drag state, with the platform's drag and drop (as the binder uses it). `onDrop`
 * gets the dragged item and where it was dropped; keyboard and menu moves don't need any of this.
 */
export function useBoardDrag(onDrop: (dragged: BoardDragged, spot: BoardDropSpot) => void) {
  const dragged = shallowRef<BoardDragged | null>(null)
  const spot = shallowRef<BoardDropSpot | null>(null)

  function start(item: BoardDragged, event: DragEvent): void {
    dragged.value = item
    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', item.kind)
    }
  }

  /** Offers `candidate` under the pointer if it takes what is being dragged. */
  function over(candidate: BoardDropSpot, event: DragEvent): void {
    if (dragged.value?.kind !== candidate.kind) return
    event.preventDefault()
    if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
    spot.value = candidate
  }

  function drop(event: DragEvent): void {
    event.preventDefault()
    const item = dragged.value
    const target = spot.value
    end()
    if (item !== null && target !== null) onDrop(item, target)
  }

  function end(): void {
    dragged.value = null
    spot.value = null
  }

  const isBeatGap = (column: number, slot: number): boolean =>
    spot.value?.kind === 'beat' && spot.value.column === column && spot.value.slot === slot
  const isColumnGap = (slot: number): boolean =>
    spot.value?.kind === 'column' && spot.value.slot === slot

  return { dragged, spot, start, over, drop, end, isBeatGap, isColumnGap }
}
