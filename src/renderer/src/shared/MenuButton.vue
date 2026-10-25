<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { placeMenu } from './listbox-keys'
import { screenRectOf } from './screen-rect'
import { menuItemsOf, moveMenuFocus } from './use-menu-keys'
import type { MenuItem } from './menu-item'

defineProps<{
  /** The button's accessible name. */
  label: string
  items: readonly MenuItem[]
  /** Visible text for the button instead of ⋯, such as "More ▾". */
  trigger?: string
}>()

const open = ref(false)
/** Where the menu is drawn: over the page, so a scrolling panel or tab row never clips it. */
const position = ref<Record<string, string>>({})
/** The submenu that is open, by its item's key. */
const openChild = ref<string | null>(null)
const button = useTemplateRef<HTMLButtonElement>('button')
const menu = useTemplateRef<HTMLElement>('menu')
const root = useTemplateRef<HTMLElement>('root')

function closeOnOutside(event: PointerEvent): void {
  if (!(event.target instanceof Node) || root.value?.contains(event.target) !== true) close(false)
}

function place(): void {
  if (button.value === null) return
  const placed = placeMenu(
    screenRectOf(button.value),
    { width: window.innerWidth, height: window.innerHeight },
    isRtl()
  )
  position.value = Object.fromEntries(
    Object.entries(placed).map(([side, value]) => [side, `${String(value)}px`])
  )
}

function isRtl(): boolean {
  return root.value?.closest('[dir="rtl"], [dir="ltr"]')?.getAttribute('dir') === 'rtl'
}

/** The menu stays where it was drawn, so scrolling what is behind it closes it. */
function closeOnScroll(event: Event): void {
  if (event.target instanceof Node && menu.value?.contains(event.target) === true) return
  close(false)
}

async function show(): Promise<void> {
  place()
  open.value = true
  openChild.value = null
  document.addEventListener('pointerdown', closeOnOutside)
  window.addEventListener('scroll', closeOnScroll, true)
  await nextTick()
  if (menu.value !== null) menuItemsOf(menu.value)[0]?.focus()
}

function close(returnFocus: boolean): void {
  open.value = false
  openChild.value = null
  document.removeEventListener('pointerdown', closeOnOutside)
  window.removeEventListener('scroll', closeOnScroll, true)
  if (returnFocus) button.value?.focus()
}

function choose(item: MenuItem): void {
  if (item.disabled === true) return
  if (item.children !== undefined) {
    void openSubmenu(item.key)
    return
  }
  close(true)
  item.run()
}

async function openSubmenu(key: string): Promise<void> {
  openChild.value = key
  await nextTick()
  const submenu = menu.value?.querySelector<HTMLElement>(`[data-submenu="${CSS.escape(key)}"]`)
  if (submenu) menuItemsOf(submenu)[0]?.focus()
}

function closeSubmenu(): void {
  const key = openChild.value
  openChild.value = null
  if (key !== null)
    menu.value?.querySelector<HTMLElement>(`[data-opens="${CSS.escape(key)}"]`)?.focus()
}

function keydown(event: KeyboardEvent): void {
  const target = event.target instanceof HTMLElement ? event.target : null
  const container = target?.closest<HTMLElement>('[role="menu"]') ?? menu.value
  const inSubmenu = container?.dataset['submenu'] !== undefined
  // The submenu opens beside its item, toward the page; either side arrow opens or closes it, so
  // the key that points at it and the one menus usually use both work, in either direction.
  const sideways = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
  const opens = target?.dataset['opens']
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (inSubmenu) closeSubmenu()
    else close(true)
  } else if (event.key === 'Tab') close(false)
  else if (opens !== undefined && (sideways || event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    void openSubmenu(opens)
  } else if (inSubmenu && sideways) {
    event.preventDefault()
    closeSubmenu()
  } else if (container !== null) moveMenuFocus(event, container)
}

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
  window.removeEventListener('scroll', closeOnScroll, true)
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
      <span v-if="trigger" class="trigger-text">{{ trigger }}</span>
      <span v-else aria-hidden="true">⋯</span>
    </button>
    <div
      v-if="open"
      ref="menu"
      class="menu"
      role="menu"
      :aria-label="label"
      :style="position"
      @keydown="keydown"
    >
      <template v-for="item in items" :key="item.key">
        <hr v-if="item.separator" role="separator" />
        <div v-if="item.children" role="none" class="has-submenu">
          <button
            type="button"
            role="menuitem"
            tabindex="-1"
            aria-haspopup="menu"
            :aria-expanded="openChild === item.key"
            :data-opens="item.key"
            :data-label="item.label"
            @click="openChild === item.key ? closeSubmenu() : openSubmenu(item.key)"
          >
            <span dir="auto">{{ item.label }}</span>
            <span class="chevron" aria-hidden="true">›</span>
          </button>
          <div
            v-if="openChild === item.key"
            class="menu submenu"
            role="menu"
            :aria-label="item.label"
            :data-submenu="item.key"
          >
            <template v-for="child in item.children" :key="child.key">
              <hr v-if="child.separator" role="separator" />
              <button
                type="button"
                :role="child.checked === undefined ? 'menuitem' : 'menuitemradio'"
                :aria-checked="child.checked"
                :aria-disabled="child.disabled ? 'true' : undefined"
                tabindex="-1"
                :class="{ note: child.disabled }"
                :data-label="child.label"
                @click="choose(child)"
              >
                <span v-if="child.checked !== undefined" class="check" aria-hidden="true">{{
                  child.checked ? '✓' : ''
                }}</span>
                <span dir="auto">{{ child.label }}</span>
                <kbd v-if="child.shortcut" dir="ltr">{{ child.shortcut }}</kbd>
              </button>
            </template>
          </div>
        </div>
        <button
          v-else
          type="button"
          :role="item.checked === undefined ? 'menuitem' : 'menuitemradio'"
          :aria-checked="item.checked"
          :aria-disabled="item.disabled ? 'true' : undefined"
          tabindex="-1"
          :class="{ note: item.disabled }"
          :data-label="item.label"
          @click="choose(item)"
        >
          <span v-if="item.checked !== undefined" class="check" aria-hidden="true">{{
            item.checked ? '✓' : ''
          }}</span>
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
  animation: rise-in var(--duration-quick) var(--ease-out);
  position: fixed;
  z-index: 1000;
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
  justify-content: flex-start;
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

.has-submenu {
  position: relative;
  display: flex;
  flex-direction: column;
}

.submenu {
  position: absolute;
  top: calc(-1 * var(--space-2));
  inset-inline-end: calc(100% + var(--space-2));
}

[dir='rtl'] .chevron {
  transform: scaleX(-1);
}

.chevron,
kbd {
  margin-inline-start: auto;
}

.chevron {
  color: var(--text-muted);
}

.check {
  inline-size: 1em;
  color: var(--accent);
}

.menu button.note {
  color: var(--text-muted);
  font-size: var(--text-small);
  cursor: default;
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
