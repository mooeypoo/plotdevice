<script setup lang="ts">
import type { ProjectPath } from '@plotdevice/shared'
import { computed, ref } from 'vue'
import { useLinkActions } from '../composables/use-link-actions'
import { useSettingsStore } from '../stores/settings'

// Beside a link the cursor is in (Milestone 16): where it goes, Open, Change link… and Remove link.
// The link's words are edited in the text itself; this changes only where it goes. Like the format
// bubble, clicks don't take the keyboard from the editor; Tab reaches it and Escape returns.
const props = defineProps<{
  link: { target: string; x: number; y: number; focused?: boolean } | null
  from: ProjectPath | null
  /** While text is selected the format bubble shows instead. */
  hidden?: boolean
}>()
const emit = defineEmits<{ change: [target: string]; remove: []; back: [] }>()
const t = useSettingsStore().t
const actions = useLinkActions()
const root = ref<HTMLElement | null>(null)
const hasFocus = ref(false)
const shown = computed(
  () => props.link !== null && props.from !== null && !props.hidden && (props.link.focused !== false || hasFocus.value),
)
const position = computed(() => (props.link ? { left: `${props.link.x}px`, top: `${props.link.y}px` } : {}))
const name = computed(() => (props.link && props.from ? actions.nameOf(props.from, props.link.target) : ''))

async function change(): Promise<void> {
  if (!props.link || !props.from) return
  const target = await actions.choose(props.from, props.link.target)
  if (target) emit('change', target)
  else emit('back')
}

function open(): void {
  if (props.link && props.from) actions.open(props.from, props.link.target)
}

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
    class="format-bubble link-bubble"
    :style="position"
    role="toolbar"
    :aria-label="t('toolbar-link')"
    data-testid="link-bubble"
    @mousedown.prevent
    @focusin="hasFocus = true"
    @focusout="onFocusOut"
    @keydown="onKey"
  >
    <span class="link-bubble-target" dir="auto" data-testid="link-bubble-target">{{ t('link-goes-to', name) }}</span>
    <span class="divider" aria-hidden="true"></span>
    <button type="button" data-testid="link-open" @click="open">{{ t('link-open') }}</button>
    <button type="button" data-testid="link-change" @click="change">{{ t('link-change') }}</button>
    <button type="button" data-testid="link-remove" @click="emit('remove')">{{ t('link-remove') }}</button>
  </div>
</template>
