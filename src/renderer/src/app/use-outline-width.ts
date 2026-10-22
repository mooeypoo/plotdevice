import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { findView } from '../workbench/model/layout'
import { resizeArea } from '../workbench/model/operations'
import { DOCK_SIZE } from '../workbench/model/sizes'
import type { AreaRegion } from '../workbench/model/vocabulary'
import { useWorkbenchStore } from './workbench-store'

const OUTLINE_WIDTH = DOCK_SIZE

/**
 * Shared reference/outline resizing in the classic shell, leaving room for the writing surface.
 * The width is the size of the workbench dock holding the outline, so both shells share it.
 */
export function useOutlineWidth(panel: Ref<HTMLElement | null>) {
  const workbench = useWorkbenchStore()
  const outlineRegion = (): AreaRegion | undefined => findView(workbench.layout, 'outline')?.region
  const preferred = computed(() => {
    const region = outlineRegion()
    return region === undefined ? DOCK_SIZE.end : workbench.layout[region].size
  })
  const maximum = ref<number>(OUTLINE_WIDTH.max)
  const expanded = ref(false)
  const draft = ref<number | null>(null)
  const minimum = computed(() => Math.min(OUTLINE_WIDTH.min, maximum.value))
  const clamp = (value: number): number =>
    Math.round(Math.min(maximum.value, Math.max(minimum.value, value)))
  const width = computed(() =>
    clamp(draft.value ?? (expanded.value ? Math.max(560, preferred.value) : preferred.value))
  )
  let observer: ResizeObserver | undefined
  let drag: { readonly x: number; readonly width: number; readonly direction: number } | undefined

  onMounted(() => {
    const body = panel.value?.parentElement
    if (body === undefined || body === null) return
    const measure = (): void => {
      const siblings = [...body.children].filter(
        (child) => child !== panel.value && child.tagName !== 'MAIN'
      )
      const occupied = siblings.reduce(
        (total, child) => total + child.getBoundingClientRect().width,
        0
      )
      maximum.value = Math.min(OUTLINE_WIDTH.max, Math.max(0, body.clientWidth - occupied - 280))
    }
    observer = new ResizeObserver(measure)
    observer.observe(body)
    for (const child of body.children) observer.observe(child)
    measure()
  })
  onBeforeUnmount(() => observer?.disconnect())

  function save(value: number): void {
    const region = outlineRegion()
    const width = Math.max(OUTLINE_WIDTH.min, clamp(value))
    if (region !== undefined) workbench.apply((layout) => resizeArea(layout, region, width))
    expanded.value = false
  }

  function isRtl(): boolean {
    return document.documentElement.dir === 'rtl'
  }

  function start(event: PointerEvent): void {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return
    event.preventDefault()
    const direction = isRtl() ? -1 : 1
    drag = { x: event.clientX, width: width.value, direction }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent): void {
    if (drag === undefined) return
    draft.value = clamp(drag.width + (drag.x - event.clientX) * drag.direction)
  }

  function finish(): void {
    if (drag === undefined) return
    if (draft.value !== null) save(draft.value)
    draft.value = null
    drag = undefined
  }

  function cancel(): void {
    draft.value = null
    drag = undefined
  }

  function keydown(event: KeyboardEvent): void {
    const rtl = isRtl()
    let next: number
    switch (event.key) {
      case 'ArrowLeft':
        next = width.value + (rtl ? -20 : 20)
        break
      case 'ArrowRight':
        next = width.value + (rtl ? 20 : -20)
        break
      case 'Home':
        next = minimum.value
        break
      case 'End':
        next = maximum.value
        break
      default:
        return
    }
    event.preventDefault()
    save(next)
  }

  return { width, minimum, maximum, expanded, start, move, finish, cancel, keydown }
}
