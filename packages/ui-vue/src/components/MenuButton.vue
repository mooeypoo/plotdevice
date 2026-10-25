<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import type { MenuItem } from './menu'

const props = defineProps<{ label: string; items: MenuItem[]; text?: string; testid?: string }>()
const open = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)

const entries = (): HTMLButtonElement[] => [...(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])]

async function show(): Promise<void> {
  open.value = true
  await nextTick()
  entries()[0]?.focus()
  document.addEventListener('pointerdown', onOutside, true)
}

function close(returnFocus = true): void {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) button.value?.focus()
}

function onOutside(event: PointerEvent): void {
  if (!menu.value?.contains(event.target as Node) && event.target !== button.value) close(false)
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
      :aria-label="props.label"
      :title="props.label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :data-testid="props.testid"
      @click="open ? close() : show()"
      @keydown.down.prevent="show()"
    >
      {{ props.text ?? '⋯' }}
    </button>
    <div v-if="open" ref="menu" class="menu-list" role="menu" :aria-label="props.label" @keydown="onKey">
      <template v-for="(item, index) in props.items" :key="item.key">
        <div v-if="item.group && index > 0" class="menu-divider" role="separator"></div>
        <button type="button" role="menuitem" :disabled="item.disabled" :data-testid="`menu-${item.key}`" @click="choose(item)">{{ item.label }}</button>
      </template>
    </div>
  </span>
</template>
