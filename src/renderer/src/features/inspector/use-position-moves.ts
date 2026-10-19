import { computed, type ComputedRef } from 'vue'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'

/** A part the open chapter can move to. */
export interface PartOption {
  readonly path: string
  readonly title: string
}

/** Moving the open entry without dragging: up, down, or to another part. */
export interface PositionMoves {
  readonly canMoveUp: ComputedRef<boolean>
  readonly canMoveDown: ComputedRef<boolean>
  /** The parts a chapter can move to; empty in a book without parts. */
  readonly partOptions: ComputedRef<readonly PartOption[]>
  moveUp(): Promise<void>
  moveDown(): Promise<void>
  /** Moves the open chapter to the end of another part. */
  moveToPart(partPath: string): Promise<void>
}

/** The keyboard alternative to dragging in the binder (see Phase 3b in docs/roadmap.md). */
export function usePositionMoves(): PositionMoves {
  const manuscript = useManuscriptStore()
  const editor = useEditorStore()

  // Where the open entry sits: its list, its index in it, and the list's part.
  const place = computed(() => {
    const book = manuscript.manuscript
    const entry = editor.entry
    if (book === null || entry === null) return undefined
    if (entry.kind === 'part') {
      const paths = book.parts.map((part) => part.path)
      const index = paths.indexOf(entry.path)
      return index === -1 ? undefined : { kind: 'part' as const, paths, index }
    }
    const part = manuscript.currentPart
    const paths = (part?.chapters ?? book.chapters).map((chapter) => chapter.path)
    const index = paths.indexOf(entry.path)
    return index === -1
      ? undefined
      : { kind: 'chapter' as const, part: part?.path ?? null, paths, index }
  })

  const canMoveUp = computed(() => (place.value?.index ?? 0) > 0)
  const canMoveDown = computed(() => {
    const current = place.value
    return current !== undefined && current.index < current.paths.length - 1
  })

  const partOptions = computed<readonly PartOption[]>(() => {
    const book = manuscript.manuscript
    if (book === null) return []
    return [...book.parts, ...book.unnumberedParts].map((part) => ({
      path: part.path,
      title: part.title
    }))
  })

  async function moveBy(step: -1 | 1): Promise<void> {
    const current = place.value
    const path = editor.entry?.path
    if (current === undefined || path === undefined) return
    const index = current.index + step
    if (current.kind === 'part') await manuscript.movePart(path, index)
    else await manuscript.moveChapter(path, { part: current.part, index })
  }

  async function moveToPart(partPath: string): Promise<void> {
    const path = editor.entry?.path
    const target = [
      ...(manuscript.manuscript?.parts ?? []),
      ...(manuscript.manuscript?.unnumberedParts ?? [])
    ].find((part) => part.path === partPath)
    if (path === undefined || target === undefined || manuscript.currentPart?.path === partPath)
      return
    await manuscript.moveChapter(path, { part: partPath, index: target.chapters.length })
  }

  return {
    canMoveUp,
    canMoveDown,
    partOptions,
    moveUp: () => moveBy(-1),
    moveDown: () => moveBy(1),
    moveToPart
  }
}
