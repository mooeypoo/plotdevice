import { inject, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import {
  accepts,
  dropRequest,
  slotAt,
  type DraggedEntry,
  type DropRequest,
  type DropSpot
} from './binder-drop'

/** The binder's drag state, shared by the tree and its parts. */
export interface BinderDrag {
  readonly dragged: Readonly<ShallowRef<DraggedEntry | null>>
  readonly spot: Readonly<ShallowRef<DropSpot | null>>
  start(entry: DraggedEntry, event: DragEvent): void
  /** Offers `spot` under the pointer; accepted spots show the drop indicator. */
  over(spot: DropSpot, event: DragEvent): void
  /** For a list row: the gap above or below it, from where the pointer is. */
  overRow(spot: (slot: number) => DropSpot, rowIndex: number, event: DragEvent): void
  /** The pointer is over something that takes no drop. */
  clear(event: DragEvent): void
  drop(event: DragEvent): void
  end(): void
  /** Whether the indicator belongs at `slot` of the chapter list of `part`. */
  isChapterGap(part: string | null, slot: number): boolean
  isPartGap(slot: number): boolean
}

const KEY: InjectionKey<BinderDrag> = Symbol('binder-drag')

/** Creates the drag state for a binder; `onDrop` gets each move a drop asks for. */
export function provideBinderDrag(onDrop: (request: DropRequest) => void): BinderDrag {
  const dragged = shallowRef<DraggedEntry | null>(null)
  const spot = shallowRef<DropSpot | null>(null)

  const drag: BinderDrag = {
    dragged,
    spot,
    start(entry, event) {
      dragged.value = entry
      if (event.dataTransfer !== null) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', entry.path)
      }
    },
    over(candidate, event) {
      const current = dragged.value
      if (current === null || !accepts(current, candidate)) return
      event.preventDefault()
      if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
      spot.value = candidate
    },
    overRow(candidate, rowIndex, event) {
      const target = event.currentTarget
      if (!(target instanceof HTMLElement)) return
      const box = target.getBoundingClientRect()
      drag.over(candidate(slotAt(rowIndex, event.clientY - box.top, box.height)), event)
    },
    clear(event) {
      if (!event.defaultPrevented) spot.value = null
    },
    drop(event) {
      event.preventDefault()
      const current = dragged.value
      const target = spot.value
      drag.end()
      if (current === null || target === null) return
      const request = dropRequest(current, target)
      if (request !== undefined) onDrop(request)
    },
    end() {
      dragged.value = null
      spot.value = null
    },
    isChapterGap(part, slot) {
      const current = spot.value
      return current?.kind === 'chapters' && current.part === part && current.slot === slot
    },
    isPartGap(slot) {
      const current = spot.value
      return current?.kind === 'parts' && current.slot === slot
    }
  }
  provide(KEY, drag)
  return drag
}

/** The drag state of the enclosing binder. */
export function useBinderDrag(): BinderDrag {
  const drag = inject(KEY)
  if (drag === undefined) throw new Error('useBinderDrag needs provideBinderDrag in a parent.')
  return drag
}
