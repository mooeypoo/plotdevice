<script setup lang="ts">
import { computed } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { uiDirection } from '../../../../i18n/locales'
import {
  resizeByKey,
  resizeByPointer,
  resizeShelfByKey,
  resizeShelfByPointer
} from '../model/direction'
import type { AreaRegion } from '../model/vocabulary'

const props = defineProps<{
  region: AreaRegion
  /** The displayed size the separator controls. */
  size: number
  minimum: number
  maximum: number
  label: string
  controls: string
}>()
const emit = defineEmits<{
  /** A size to show while dragging, or `null` when the drag ends or is cancelled. */
  preview: [size: number | null]
  /** The size to keep. */
  commit: [size: number]
  /** A double-click on the separator: widen or restore the panel it belongs to. */
  expand: []
}>()

const language = useUiLanguageStore()
const direction = computed(() => uiDirection(language.locale))
let drag:
  { readonly x: number; readonly y: number; readonly size: number; last: number } | undefined

const clamp = (value: number): number =>
  Math.round(Math.min(props.maximum, Math.max(props.minimum, value)))

function start(event: PointerEvent): void {
  if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return
  event.preventDefault()
  drag = { x: event.clientX, y: event.clientY, size: props.size, last: props.size }
  event.currentTarget.setPointerCapture(event.pointerId)
}

function move(event: PointerEvent): void {
  if (drag === undefined) return
  const next =
    props.region === 'bottom'
      ? resizeShelfByPointer(drag.size, event.clientY - drag.y)
      : resizeByPointer(drag.size, event.clientX - drag.x, props.region, direction.value)
  drag.last = clamp(next)
  emit('preview', drag.last)
}

function finish(): void {
  if (drag === undefined) return
  const { last, size } = drag
  drag = undefined
  emit('preview', null)
  if (last !== size) emit('commit', last)
}

function cancel(): void {
  if (drag === undefined) return
  drag = undefined
  emit('preview', null)
}

function keydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && drag !== undefined) {
    event.preventDefault()
    cancel()
    return
  }
  const next =
    props.region === 'bottom'
      ? resizeShelfByKey(props.size, event.key)
      : resizeByKey(props.size, event.key, props.region, direction.value)
  if (next === undefined) return
  event.preventDefault()
  emit('commit', clamp(next))
}
</script>

<template>
  <div
    class="splitter"
    :class="region"
    role="separator"
    tabindex="0"
    :aria-label="label"
    :aria-orientation="region === 'bottom' ? 'horizontal' : 'vertical'"
    :aria-controls="controls"
    :aria-valuemin="minimum"
    :aria-valuemax="maximum"
    :aria-valuenow="size"
    @pointerdown="start"
    @pointermove="move"
    @pointerup="finish"
    @pointercancel="cancel"
    @lostpointercapture="finish"
    @keydown="keydown"
    @dblclick="emit('expand')"
  ></div>
</template>

<style scoped>
.splitter {
  position: absolute;
  z-index: 1;
  touch-action: none;
}

/* Each dock's separator sits on the edge facing the page. */
.splitter.start,
.splitter.end {
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
}

.splitter.start {
  inset-inline-end: -4px;
}

.splitter.end {
  inset-inline-start: -4px;
}

.splitter.bottom {
  inset-inline: 0;
  top: -4px;
  height: 8px;
  cursor: row-resize;
}

.splitter:hover,
.splitter:focus-visible {
  background: var(--accent-soft);
  outline: 1px solid var(--accent);
}
</style>
