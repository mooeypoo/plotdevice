<script setup lang="ts">
import { createItemEditor, type ItemEditor } from '@plotdevice/editor-codemirror'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLinkPicker } from '../composables/use-link-picker'
import { useLinkSuggestions } from '../composables/use-link-suggestions'
import { useSettingsStore } from '../stores/settings'
import AppIcon from './AppIcon.vue'
import LinkSuggestions from './LinkSuggestions.vue'

// A card's or item's text, edited in place with its links shown as names. Typing @ (or [[) offers
// pages and chapters to link; the link button opens the full picker. Emits like `EditableText`.
/** `bare`: a new line in the list, shown as a row with no box. `hint` replaces the default line under it. */
const props = defineProps<{ value: string; label: string; nests?: boolean; bare?: boolean; placeholder?: string; hint?: string }>()
const emit = defineEmits<{ commit: [text: string | null, byEnter: boolean]; indent: [text: string]; outdent: [text: string] }>()
const settings = useSettingsStore()
const { pick } = useLinkPicker()
const t = settings.t
const host = ref<HTMLElement | null>(null)
let editor: ItemEditor | null = null

const { query, selected, offered, open, linkFor, choose, onListKey } = useLinkSuggestions((markdown) => editor?.insertLink(markdown))

// Moving the line (Tab) redraws it elsewhere; leaving this field then must not also add it here.
let moving = false
let unmounted = false

async function pickLink(): Promise<void> {
  const target = await pick()
  if (target) editor?.insertLink(linkFor(target))
  // The closing dialog gives focus back to the link button; take it back once it has closed.
  setTimeout(() => editor?.focus())
}

onMounted(() => {
  if (!host.value) return
  editor = createItemEditor(host.value, {
    text: props.value,
    label: props.label,
    testId: 'editable-text',
    ...(props.placeholder ? { placeholder: props.placeholder } : {}),
    onLinkQuery: (found) => (query.value = found),
    onListKey,
    onDone: (text, byEnter) => {
      if (moving) return
      // A link is added with a space after it, to carry on typing; it isn't kept at the end.
      emit('commit', text === null ? null : text.trim(), byEnter)
    },
    ...(props.nests
      ? {
          onNest: (direction: 'in' | 'out', text: string) => {
            moving = true
            if (direction === 'in') emit('indent', text)
            else emit('outdent', text)
            // Nowhere to move it (the first line can't become a detail): carry on typing here.
            void nextTick(() => {
              if (!unmounted) moving = false
            })
          },
        }
      : {}),
  })
  editor.focus()
})

onBeforeUnmount(() => {
  unmounted = true
  moving = true
  editor?.destroy()
})
</script>

<template>
  <div class="item-field" :class="{ bare }">
    <div class="item-field-box">
      <div ref="host" class="item-editor"></div>
      <button
        type="button"
        class="item-link-button"
        data-testid="item-link"
        :aria-label="t('link-to')"
        :title="t('link-to')"
        @mousedown.prevent
        @click="pickLink"
      >
        <AppIcon name="link" />
      </button>
      <LinkSuggestions v-if="open && query" :query="query" :offered="offered" :selected="selected" @choose="choose" />
    </div>
    <span class="line-keys">{{ hint ?? (nests ? `${t('outline-line-keys')} · ${t('item-link-hint')}` : t('item-link-hint')) }}</span>
  </div>
</template>
