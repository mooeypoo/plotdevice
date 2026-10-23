<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef } from 'vue'
import { edgeEnabledIndex, nextEnabledIndex, placeList, typeaheadIndex } from './listbox-keys'
import type { ListPlacement } from './listbox-keys'
import { screenRectOf } from './screen-rect'
import type { SelectOption } from './select-option'

/**
 * The app's one select: a button showing the value that opens a list of choices (the ARIA
 * select-only combobox). Focus stays on the button; the list is drawn over everything, so a
 * panel's overflow never clips it, and it opens toward whichever side has room.
 */
const props = defineProps<{
  modelValue: string
  options: readonly SelectOption[]
  /** Shown when the value matches no choice. */
  placeholder?: string
  disabled?: boolean
  /** Lets a `<label for>` name and open the select. */
  id?: string
  ariaLabel?: string
  ariaDescribedby?: string
  size?: 'small'
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const listId = useId()
const optionId = (index: number): string => `${listId}-${String(index)}`
const open = ref(false)
const active = ref(-1)
const placement = ref<ListPlacement | undefined>()
/** Where the list is drawn: the body, or the popover the select sits in (popovers cover the body). */
const layer = ref<HTMLElement | 'body'>('body')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const list = useTemplateRef<HTMLElement>('list')
let typed = ''
let typedAt = 0

const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue)
)
const selected = computed(() => props.options[selectedIndex.value])

function isRtl(): boolean {
  return trigger.value?.closest('[dir="rtl"], [dir="ltr"]')?.getAttribute('dir') === 'rtl'
}

function locale(): string {
  return trigger.value?.closest('[lang]')?.getAttribute('lang') ?? 'en'
}

async function show(): Promise<void> {
  if (props.disabled || trigger.value === null) return
  placement.value = placeList(
    screenRectOf(trigger.value),
    { width: window.innerWidth, height: window.innerHeight },
    isRtl()
  )
  layer.value = trigger.value.closest<HTMLElement>('[popover]') ?? 'body'
  active.value =
    selectedIndex.value >= 0 && selected.value?.disabled !== true
      ? selectedIndex.value
      : edgeEnabledIndex(props.options, false)
  open.value = true
  document.addEventListener('pointerdown', closeOnOutside, true)
  window.addEventListener('scroll', closeOnScroll, true)
  window.addEventListener('resize', closeQuietly)
  await nextTick()
  revealActive()
}

function close(): void {
  open.value = false
  document.removeEventListener('pointerdown', closeOnOutside, true)
  window.removeEventListener('scroll', closeOnScroll, true)
  window.removeEventListener('resize', closeQuietly)
}

function closeQuietly(): void {
  close()
}

function closeOnOutside(event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Node)) return
  if (trigger.value?.contains(target) === true || list.value?.contains(target) === true) return
  close()
}

function closeOnScroll(event: Event): void {
  if (event.target instanceof Node && list.value?.contains(event.target) === true) return
  close()
}

function choose(index: number): void {
  const option = props.options[index]
  if (option === undefined || option.disabled === true) return
  close()
  trigger.value?.focus()
  if (option.value !== props.modelValue) emit('update:modelValue', option.value)
}

function revealActive(): void {
  list.value?.querySelector(`#${CSS.escape(optionId(active.value))}`)?.scrollIntoView({
    block: 'nearest'
  })
}

function moveTo(index: number): void {
  if (index < 0) return
  active.value = index
  void nextTick(revealActive)
}

function typeahead(letter: string): void {
  const now = Date.now()
  typed = now - typedAt > 700 ? letter : typed + letter
  typedAt = now
  const from = open.value ? active.value : selectedIndex.value
  const found = typeaheadIndex(props.options, typed, from, locale())
  if (found < 0) return
  if (open.value) moveTo(found)
  else choose(found)
}

function keydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const { key } = event
  if (!open.value) {
    if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      void show()
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeahead(key)
    }
    return
  }
  switch (key) {
    case 'ArrowDown':
      event.preventDefault()
      moveTo(nextEnabledIndex(props.options, active.value, 1))
      break
    case 'ArrowUp':
      event.preventDefault()
      if (event.altKey) choose(active.value)
      else moveTo(nextEnabledIndex(props.options, active.value, -1))
      break
    case 'Home':
      event.preventDefault()
      moveTo(edgeEnabledIndex(props.options, false))
      break
    case 'End':
      event.preventDefault()
      moveTo(edgeEnabledIndex(props.options, true))
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (key === ' ' && Date.now() - typedAt < 700) typeahead(key)
      else choose(active.value)
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (key.length === 1 && !event.ctrlKey && !event.metaKey) typeahead(key)
  }
}

const listStyle = computed(() => {
  const place = placement.value
  if (place === undefined) return {}
  const px = (value: number | undefined): string | undefined =>
    value === undefined ? undefined : `${String(value)}px`
  return {
    top: px(place.top),
    bottom: px(place.bottom),
    left: px(place.left),
    right: px(place.right),
    minWidth: px(place.minWidth),
    maxHeight: px(place.maxHeight)
  }
})

onBeforeUnmount(close)

defineExpose({
  /** Moves keyboard focus to the select, as `focus()` does for a native one. */
  focus: (): void => trigger.value?.focus()
})
</script>

<template>
  <span class="select-field" :class="{ small: size === 'small' }">
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
      :aria-label="ariaLabel"
      :aria-describedby="ariaDescribedby"
      :disabled="disabled"
      @click="open ? close() : show()"
      @keydown="keydown"
    >
      <span
        class="value"
        :class="{ placeholder: selected === undefined }"
        :lang="selected?.lang"
        :dir="selected?.dir ?? 'auto'"
        :title="selected?.title"
        >{{ selected?.label ?? placeholder ?? '' }}</span
      >
      <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 10l5 5 5-5" />
      </svg>
    </button>
    <Teleport :to="layer">
      <ul
        v-if="open"
        :id="listId"
        ref="list"
        class="select-list"
        :class="{ small: size === 'small' }"
        role="listbox"
        :aria-label="ariaLabel"
        :dir="isRtl() ? 'rtl' : 'ltr'"
        :style="listStyle"
        tabindex="-1"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="`${index}:${option.value}`"
          role="option"
          :aria-selected="index === selectedIndex"
          :aria-disabled="option.disabled === true ? 'true' : undefined"
          :class="{ active: index === active, selected: index === selectedIndex }"
          :lang="option.lang"
          :dir="option.dir ?? 'auto'"
          :title="option.title"
          :data-value="option.value"
          @pointerdown.prevent
          @pointermove="option.disabled === true || (active = index)"
          @click="choose(index)"
        >
          <span class="check" aria-hidden="true">{{ index === selectedIndex ? '✓' : '' }}</span>
          <span class="label">{{ option.label }}</span>
        </li>
      </ul>
    </Teleport>
  </span>
</template>

<style scoped>
.select-field {
  display: inline-flex;
  min-inline-size: 0;
  max-inline-size: 100%;
}

.trigger {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-inline-size: 0;
  min-block-size: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-field);
  background: var(--bg);
  color: var(--text);
  font-size: var(--text-body);
  text-align: start;
}

.trigger:hover:not(:disabled) {
  border-color: var(--text-faint);
  background: var(--bg);
}

.trigger[aria-expanded='true'] {
  border-color: var(--accent);
}

.small .trigger {
  min-block-size: var(--control-height-small);
  padding-inline: var(--space-3) var(--space-2);
  font-size: var(--text-small);
}

.value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.placeholder {
  color: var(--text-muted);
}

.chevron {
  flex: none;
  inline-size: 14px;
  block-size: 14px;
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>

<style>
/* The list is teleported to the body, outside the component's scope. */
.select-list {
  position: fixed;
  z-index: 1000;
  overflow-y: auto;
  margin: 0;
  padding: var(--space-2);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-card);
  background: var(--raised);
  box-shadow: var(--shadow-popover);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--text-body);
  list-style: none;
}

.select-list.small {
  font-size: var(--text-small);
}

.select-list [role='option'] {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-block: var(--space-2);
  padding-inline: var(--space-2) var(--space-4);
  border-radius: var(--radius-field);
  cursor: pointer;
  white-space: nowrap;
}

.select-list [role='option'].active {
  background: var(--accent-soft);
  color: var(--text-strong);
}

.select-list [role='option'][aria-disabled='true'] {
  color: var(--text-faint);
  cursor: default;
}

.select-list .check {
  flex: none;
  inline-size: 1em;
  color: var(--accent);
  text-align: center;
}
</style>
