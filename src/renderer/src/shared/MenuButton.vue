<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { moveMenuFocus } from './use-menu-keys'
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
      <template v-for="item in items" :key="item.key">
        <hr v-if="item.separator" role="separator" />
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          :data-label="item.label"
          @click="choose(item)"
        >
          <span dir="auto">{{ item.label }}</span>
          <kbd v-if="item.shortcut" dir="ltr">{{ item.shortcut }}</kbd>
        </button>
      </template>
    </div>
  </span>
</template>

<style scoped>
.menu-button {
  position: relative;
  display: inline-flex;
}

.options {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-body);
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
  padding: var(--space-2);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-card);
  background: var(--raised);
  box-shadow: var(--shadow-popover);
}

.menu button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-field);
  background: transparent;
  color: var(--text);
  font-size: var(--text-body);
  text-align: start;
}

.menu button:hover,
.menu button:focus-visible {
  background: var(--accent-soft);
  color: var(--text-strong);
  outline: none;
}

.menu hr {
  margin: var(--space-2) var(--space-2);
  border: none;
  border-block-start: 1px solid var(--line);
}

kbd {
  color: var(--text-muted);
  font: inherit;
  font-size: var(--text-small);
}
</style>
