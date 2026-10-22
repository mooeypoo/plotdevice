<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { moveMenuFocus } from '../../shared/use-menu-keys'
import type { MenuItem } from './menu-item'

defineProps<{
  /** The button's accessible name. */
  label: string
  items: readonly MenuItem[]
}>()

const open = ref(false)
const button = useTemplateRef<HTMLButtonElement>('button')
const menu = useTemplateRef<HTMLElement>('menu')
const root = useTemplateRef<HTMLElement>('root')

function closeOnOutside(event: PointerEvent): void {
  if (!(event.target instanceof Node) || root.value?.contains(event.target) !== true) close(false)
}

async function show(): Promise<void> {
  open.value = true
  document.addEventListener('pointerdown', closeOnOutside)
  await nextTick()
  menu.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
}

function close(returnFocus: boolean): void {
  open.value = false
  document.removeEventListener('pointerdown', closeOnOutside)
  if (returnFocus) button.value?.focus()
}

function choose(item: MenuItem): void {
  close(true)
  item.run()
}

function keydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  } else if (event.key === 'Tab') close(false)
  else if (menu.value !== null) moveMenuFocus(event, menu.value)
}

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
})
</script>

<template>
  <span ref="root" class="menu-button">
    <button
      ref="button"
      type="button"
      class="quiet options"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="label"
      :title="label"
      @click="open ? close(true) : show()"
    >
      <span aria-hidden="true">⋯</span>
    </button>
    <div v-if="open" ref="menu" class="menu" role="menu" :aria-label="label" @keydown="keydown">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        role="menuitem"
        tabindex="-1"
        dir="auto"
        @click="choose(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </span>
</template>

<style scoped>
.menu-button {
  position: relative;
  display: inline-flex;
}

.options {
  padding: 2px 6px;
  font-size: 13px;
  line-height: 1;
}

.menu {
  position: absolute;
  z-index: 10;
  top: 100%;
  inset-inline-end: 0;
  display: flex;
  flex-direction: column;
  min-width: 13em;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  box-shadow: 0 6px 18px rgb(0 0 0 / 35%);
}

.menu button {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  text-align: start;
}

.menu button:hover,
.menu button:focus-visible {
  background: var(--accent-soft);
  outline: none;
}
</style>
