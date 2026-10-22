<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useLayoutStore } from '../../app/layout-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { fitToWidth } from '../model/fit-to-width'
import { DOCK_SIZE, MIN_PAGE_INLINE_SIZE } from '../model/sizes'
import type { DockSide } from '../model/vocabulary'
import DockArea from './DockArea.vue'
import ShelfArea from './ShelfArea.vue'

const workbench = useWorkbenchStore()
const layout = useLayoutStore()
const body = useTemplateRef<HTMLElement>('body')
/** The body's width; until measured, wide enough to show everything. */
const available = ref(Number.POSITIVE_INFINITY)
let observer: ResizeObserver | undefined

onMounted(() => {
  const element = body.value
  if (element === null) return
  const measure = (): void => {
    if (element.clientWidth > 0) available.value = element.clientWidth
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(element)
  }
})
onBeforeUnmount(() => observer?.disconnect())

/** Displayed docks: the stored layout fitted to the window, hidden while focusing. */
const fitted = computed(() => fitToWidth(workbench.layout, available.value))
const shown = (side: DockSide): boolean => !layout.focusMode && fitted.value[side].shown

/** The widest a dock may be dragged while keeping the page readable beside the other dock. */
function maximum(side: DockSide): number {
  const other = side === 'start' ? 'end' : 'start'
  const occupied = shown(other) ? fitted.value[other].size : 0
  return Math.max(0, Math.min(DOCK_SIZE.max, available.value - MIN_PAGE_INLINE_SIZE - occupied))
}
</script>

<template>
  <div ref="body" class="workbench-body">
    <DockArea
      v-if="shown('start')"
      side="start"
      :size="fitted.start.size"
      :maximum="maximum('start')"
    />
    <div class="center-column">
      <main class="main">
        <slot />
      </main>
      <ShelfArea v-if="!layout.focusMode" />
    </div>
    <DockArea v-if="shown('end')" side="end" :size="fitted.end.size" :maximum="maximum('end')" />
  </div>
</template>

<style scoped>
/* A row follows the root direction: the start dock is on the right in Hebrew. */
.workbench-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.center-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.main :deep(.pane) {
  flex: 1;
  min-height: 0;
}
</style>
