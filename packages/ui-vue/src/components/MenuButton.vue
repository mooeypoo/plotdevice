<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import type { MenuItem } from './menu'

// A button that opens a list of commands. The button shows its slot (or ⋯); `heading` names what the
// commands act on, above them; `align: 'end'` opens the list towards the end side, for buttons there.
const props = defineProps<{
  label: string
  items: MenuItem[]
  text?: string
  testid?: string
  buttonClass?: string
  align?: 'start' | 'end'
  heading?: string
}>()
const open = ref(false)
/** Set when the list would run past the window's edge: it then opens the other way. */
const flipped = ref(false)
const above = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)

const entries = (): HTMLButtonElement[] => [...(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])]

async function show(): Promise<void> {
  flipped.value = false
  above.value = false
  open.value = true
  await nextTick()
  keepInWindow()
  entries()[0]?.focus()
  document.addEventListener('pointerdown', onOutside, true)
}

/** Opens the list towards the inside of the window, so no edge of the screen hides it. */
function keepInWindow(): void {
  const box = menu.value?.getBoundingClientRect()
  if (!box) return
  flipped.value = box.right > window.innerWidth - 8 || box.left < 8
  above.value = box.bottom > window.innerHeight - 8 && box.height < (button.value?.getBoundingClientRect().top ?? 0)
}

function close(returnFocus = true): void {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) button.value?.focus()
}

function onOutside(event: PointerEvent): void {
  if (!menu.value?.contains(event.target as Node) && !button.value?.contains(event.target as Node)) close(false)
}

function choose(item: MenuItem): void {
  close()
  item.run()
}

function onKey(event: KeyboardEvent): void {
  const items = entries()
  const index = items.indexOf(document.activeElement as HTMLButtonElement)
  if (event.key === 'Escape') close()
  else if (event.key === 'ArrowDown') items[(index + 1) % items.length]?.focus()
  else if (event.key === 'ArrowUp') items[(index - 1 + items.length) % items.length]?.focus()
  else if (event.key === 'Home') items[0]?.focus()
  else if (event.key === 'End') items.at(-1)?.focus()
  else if (event.key === 'Tab') close(false)
  else return
  if (event.key !== 'Tab') event.preventDefault()
  event.stopPropagation()
}

onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))
defineExpose({ show })
</script>

<template>
  <span class="menu">
    <button
      ref="button"
      type="button"
      class="menu-button"
      :class="props.buttonClass"
      :aria-label="props.label"
      :title="props.label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :data-testid="props.testid"
      @click="open ? close() : show()"
      @keydown.down.prevent="show()"
    >
      <slot>{{ props.text }}<AppIcon v-if="props.text === undefined" name="more" /></slot>
    </button>
    <div
      v-if="open"
      ref="menu"
      class="menu-list"
      :class="{ 'align-end': (props.align === 'end') !== flipped, above }"
      role="menu"
      :aria-label="props.label"
      @keydown="onKey"
    >
      <div v-if="props.heading" class="menu-heading" dir="auto" aria-hidden="true">{{ props.heading }}</div>
      <template v-for="(item, index) in props.items" :key="item.key">
        <div v-if="(item.group && index > 0) || (index === 0 && props.heading)" class="menu-divider" role="separator"></div>
        <button type="button" role="menuitem" :disabled="item.disabled" :data-testid="`menu-${item.key}`" @click="choose(item)">
          <AppIcon v-if="item.icon" :name="item.icon" /><span class="label">{{ item.label }}</span
          ><span v-if="item.hint" class="hint" dir="ltr">{{ item.hint }}</span>
        </button>
      </template>
    </div>
  </span>
</template>
