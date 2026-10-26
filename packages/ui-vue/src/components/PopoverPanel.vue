<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'

// A button that opens a small panel of controls beside it. Like a menu, it opens with focus on the
// first control, and Escape or a click outside closes it.
const props = defineProps<{ label: string; testid?: string; buttonClass?: string; align?: 'start' | 'end' }>()
const open = ref(false)
const flipped = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

async function show(): Promise<void> {
  flipped.value = false
  open.value = true
  await nextTick()
  const box = panel.value?.getBoundingClientRect()
  flipped.value = !!box && (box.right > window.innerWidth - 8 || box.left < 8)
  panel.value?.querySelector<HTMLElement>('button:not([disabled]), select, input')?.focus()
  document.addEventListener('pointerdown', onOutside, true)
}

function close(returnFocus = true): void {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) button.value?.focus()
}

function onOutside(event: PointerEvent): void {
  if (!panel.value?.contains(event.target as Node) && !button.value?.contains(event.target as Node)) close(false)
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  close()
}

onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))
defineExpose({ close })
</script>

<template>
  <span class="menu">
    <button
      ref="button"
      type="button"
      :class="props.buttonClass"
      :aria-label="props.label"
      :title="props.label"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :data-testid="props.testid"
      @click="open ? close() : show()"
      @keydown.esc="open && close()"
    >
      <slot name="button" />
    </button>
    <div
      v-if="open"
      ref="panel"
      class="popover"
      :class="{ 'align-end': (props.align === 'end') !== flipped }"
      role="dialog"
      :aria-label="props.label"
      @keydown="onKey"
    >
      <slot :close="close" />
    </div>
  </span>
</template>
