<script setup lang="ts">
import type { FormatCommand, SelectionPlace } from '@plotdevice/editor-codemirror'
import { computed, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import AppIcon from './AppIcon.vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'

// Formatting beside selected text (Milestone 9, decision 8). Clicks don't take the keyboard from the
// editor, so the selection stays; Tab from the editor reaches the bubble, and Escape returns. Every
// command is also in the ¶ menu at the page's edge, for when nothing is selected.
const props = defineProps<{ place: SelectionPlace | null; more: MenuItem[] }>()
const emit = defineEmits<{ format: [command: FormatCommand]; link: []; back: [] }>()
const settings = useSettingsStore()
const t = settings.t
const root = ref<HTMLElement | null>(null)
const hasFocus = ref(false)
const shown = computed(() => props.place !== null && (props.place.focused || hasFocus.value))
const position = computed(() => (props.place ? { left: `${props.place.x}px`, top: `${props.place.y}px` } : {}))

function onFocusOut(event: FocusEvent): void {
  hasFocus.value = root.value?.contains(event.relatedTarget as Node) ?? false
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  emit('back')
}
</script>

<template>
  <div
    v-show="shown"
    ref="root"
    class="format-bubble"
    :style="position"
    role="toolbar"
    :aria-label="t('toolbar-format')"
    data-testid="format-bubble"
    @mousedown="($event.target as HTMLElement).closest('.menu-list') || $event.preventDefault()"
    @focusin="hasFocus = true"
    @focusout="onFocusOut"
    @keydown="onKey"
  >
    <button
      type="button"
      :aria-label="t('format-bold')"
      :title="t('format-bold')"
      data-testid="bubble-bold"
      @click="emit('format', 'bold')"
    >
      <strong>B</strong>
    </button>
    <button type="button" class="serif" :aria-label="t('format-italic')" :title="t('format-italic')" @click="emit('format', 'italic')">
      <em>I</em>
    </button>
    <button type="button" :aria-label="t('format-link')" :title="t('format-link')" @click="emit('link')"><AppIcon name="link" /></button>
    <button type="button" class="serif" :aria-label="t('format-quote')" :title="t('format-quote')" @click="emit('format', 'quote')">
      “
    </button>
    <span class="divider" aria-hidden="true"></span>
    <MenuButton :label="t('format-more')" :items="more" align="end" />
  </div>
</template>
