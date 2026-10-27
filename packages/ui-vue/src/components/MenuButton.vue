<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { menuPlacement } from '@plotdevice/presentation'
import AppIcon from './AppIcon.vue'
import type { MenuItem } from './menu'

// A button that opens a list of commands. The button shows its slot (or ⋯); `heading` names what the
// commands act on, above them; `align: 'end'` opens the list towards the end side, for buttons there.
// `showFrom` opens it beside another element instead (a right-click on a tag), with no button shown.
const props = defineProps<{
  label: string
  items: MenuItem[]
  text?: string
  testid?: string
  buttonClass?: string
  align?: 'start' | 'end'
  heading?: string
  /** No button of its own: the list only opens through `showFrom`. */
  buttonless?: boolean
}>()
const open = ref(false)
/** Where the list is, fixed to the window so no scrolling area or bar hides it; `null` until measured. */
const place = ref<{ top: number; left: number; maxHeight: number } | null>(null)
const button = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
/** What the list opened beside, when not its own button; focus returns there. */
const anchor = ref<HTMLElement | null>(null)
const opener = (): HTMLElement | null => anchor.value ?? button.value

const entries = (): HTMLButtonElement[] => [...(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])]

async function show(): Promise<void> {
  place.value = null
  open.value = true
  await nextTick()
  keepInWindow()
  await nextTick() // shown once placed; only then can it take focus
  entries()[0]?.focus()
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('resize', onMoved)
  document.addEventListener('scroll', onMoved, true)
}

/** Opens the list below the button, or above it when there's more room there, inside the window. */
function keepInWindow(): void {
  const list = menu.value
  const at = opener()?.getBoundingClientRect()
  if (!list || !at) return
  const rtl = getComputedStyle(list).direction === 'rtl'
  const { top, left, maxHeight } = menuPlacement(
    at,
    { width: list.offsetWidth, height: list.scrollHeight },
    { width: window.innerWidth, height: window.innerHeight },
    { align: props.align ?? 'start', rtl },
  )
  place.value = { top, left, maxHeight }
}

/** The page moved under an open list (scrolling, a resized window): the list follows its button. */
function onMoved(): void {
  if (open.value) keepInWindow()
}

function close(returnFocus = true): void {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', onMoved)
  document.removeEventListener('scroll', onMoved, true)
  if (returnFocus) opener()?.focus()
  anchor.value = null
}

/** Opens the list beside `element`, as if it were the button. */
function showFrom(element: HTMLElement): Promise<void> {
  anchor.value = element
  return show()
}

function onOutside(event: PointerEvent): void {
  if (!menu.value?.contains(event.target as Node) && !opener()?.contains(event.target as Node)) close(false)
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

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', onMoved)
  document.removeEventListener('scroll', onMoved, true)
})
defineExpose({ show, showFrom })
</script>

<template>
  <span class="menu">
    <button
      v-if="!props.buttonless"
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
      @keydown.esc="open && close()"
    >
      <slot>{{ props.text }}<AppIcon v-if="props.text === undefined" name="more" /></slot>
    </button>
    <div
      v-if="open"
      ref="menu"
      class="menu-list"
      :class="{ placed: place !== null }"
      :style="place ? { top: `${place.top}px`, left: `${place.left}px`, maxHeight: `${place.maxHeight}px` } : undefined"
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
