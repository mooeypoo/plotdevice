<script setup lang="ts">
import { PANEL_WIDTHS, type PanelWidthSetting } from '@plotdevice/shared'
import { computed } from 'vue'
import { usePanelWidths } from '../composables/use-panel-widths'

// The edge between a side panel and the page. Drag it, or focus it and use the arrow keys, to make the
// panel wider or narrower; double-click puts it back. The width is the author's own setting.
const props = defineProps<{
  setting: PanelWidthSetting
  label: string
  /** Which way the panel grows: toward the start of a line (the shelf) or its end (the chapters list). */
  grows: 'start' | 'end'
}>()
const panels = usePanelWidths()
const limits = computed(() => PANEL_WIDTHS[props.setting])
const STEP = 16
let drag: { x: number; width: number; rtl: boolean } | null = null

const isRtl = (element: Element): boolean => getComputedStyle(element).direction === 'rtl'

/** How much wider the panel gets when the edge moves `dx` pixels to the right on screen. */
function widening(dx: number, rtl: boolean): number {
  const towardEnd = rtl ? -dx : dx
  return props.grows === 'end' ? towardEnd : -towardEnd
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  drag = { x: event.clientX, width: panels.width(props.setting), rtl: isRtl(handle) }
  event.preventDefault()
}

function onPointerMove(event: PointerEvent): void {
  if (drag) panels.resize(props.setting, drag.width + widening(event.clientX - drag.x, drag.rtl), false)
}

function onPointerUp(event: PointerEvent): void {
  if (!drag) return
  panels.resize(props.setting, drag.width + widening(event.clientX - drag.x, drag.rtl), true)
  drag = null
}

function onKey(event: KeyboardEvent): void {
  const rtl = isRtl(event.currentTarget as HTMLElement)
  const current = panels.width(props.setting)
  const next =
    event.key === 'ArrowLeft'
      ? current + widening(-STEP, rtl)
      : event.key === 'ArrowRight'
        ? current + widening(STEP, rtl)
        : event.key === 'Home'
          ? limits.value.min
          : event.key === 'End'
            ? limits.value.max
            : null
  if (next === null) return
  event.preventDefault()
  panels.resize(props.setting, next, true)
}
</script>

<template>
  <div
    class="resize-handle"
    :class="`resize-${grows}`"
    role="separator"
    aria-orientation="vertical"
    tabindex="0"
    :aria-label="label"
    :aria-valuenow="panels.width(setting)"
    :aria-valuemin="limits.min"
    :aria-valuemax="limits.max"
    :data-testid="`resize-${setting}`"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKey"
    @dblclick="panels.resize(setting, limits.initial, true)"
  ></div>
</template>
