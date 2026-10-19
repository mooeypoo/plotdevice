import type { ChapterDestinationDto } from '../../../../contract/dtos'

/** What the writer is dragging in the binder. */
export interface DraggedEntry {
  readonly kind: 'chapter' | 'part'
  readonly path: string
}

/**
 * Where a drop would land. `slot` is a gap in the list as shown: 0 is before the first row, and
 * the list's length is after the last.
 */
export type DropSpot =
  | {
      readonly kind: 'chapters'
      /** The part's path, or `null` for a book without parts. */
      readonly part: string | null
      readonly paths: readonly string[]
      readonly slot: number
    }
  | { readonly kind: 'parts'; readonly paths: readonly string[]; readonly slot: number }
  | { readonly kind: 'unordered' }

/** What a drop asks for, or `undefined` when it would change nothing. */
export type DropRequest =
  | {
      readonly kind: 'move-chapter'
      readonly path: string
      readonly destination: ChapterDestinationDto | null
    }
  | { readonly kind: 'move-part'; readonly path: string; readonly index: number }

/** The gap a pointer is nearest: before the row in its top half, after it in the bottom half. */
export function slotAt(rowIndex: number, offsetY: number, rowHeight: number): number {
  return offsetY < rowHeight / 2 ? rowIndex : rowIndex + 1
}

/** Whether `dragged` can be dropped on `spot`: chapters go into chapter lists or the tray, parts among parts. */
export function accepts(dragged: DraggedEntry, spot: DropSpot): boolean {
  return dragged.kind === 'part' ? spot.kind === 'parts' : spot.kind !== 'parts'
}

/**
 * Turns a drop into a move. The index is a position among the other entries, which is what the
 * main process expects; a drop back where the entry already is asks for nothing.
 */
export function dropRequest(dragged: DraggedEntry, spot: DropSpot): DropRequest | undefined {
  if (!accepts(dragged, spot)) return undefined
  if (spot.kind === 'unordered') {
    return { kind: 'move-chapter', path: dragged.path, destination: null }
  }
  const from = spot.paths.indexOf(dragged.path)
  if (from !== -1 && (spot.slot === from || spot.slot === from + 1)) return undefined
  const index = from !== -1 && from < spot.slot ? spot.slot - 1 : spot.slot
  return spot.kind === 'parts'
    ? { kind: 'move-part', path: dragged.path, index }
    : { kind: 'move-chapter', path: dragged.path, destination: { part: spot.part, index } }
}
