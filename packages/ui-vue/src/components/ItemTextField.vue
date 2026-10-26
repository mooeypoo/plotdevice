<script setup lang="ts">
import { createItemEditor, type ItemEditor } from '@plotdevice/editor-codemirror'
import { linkTargets, markdownLink, search, suggestedLinkTargets, type LinkTarget } from '@plotdevice/presentation'
import { dirnameOf } from '@plotdevice/shared'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLinkPicker } from '../composables/use-link-picker'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import AppIcon from './AppIcon.vue'

// A card's or item's text, edited in place with its links shown as names. Typing @ (or [[) offers
// pages and chapters to link; the link button opens the full picker. Emits like `EditableText`.
/** `bare`: a new line in the list, shown as a row with no box. `hint` replaces the default line under it. */
const props = defineProps<{ value: string; label: string; nests?: boolean; bare?: boolean; placeholder?: string; hint?: string }>()
const emit = defineEmits<{ commit: [text: string | null, byEnter: boolean]; indent: [text: string]; outdent: [text: string] }>()
const project = useProjectStore()
const story = useStoryStore()
const settings = useSettingsStore()
const { pick } = useLinkPicker()
const t = settings.t
const host = ref<HTMLElement | null>(null)
let editor: ItemEditor | null = null

const query = ref<{ text: string; x: number; y: number } | null>(null)
const selected = ref(0)
const targets = computed<LinkTarget[]>(() => (project.project ? linkTargets(project.project, story.references) : []))
const offered = computed<LinkTarget[]>(() => {
  const typed = query.value?.text.trim()
  if (typed === undefined) return []
  if (typed === '') return suggestedLinkTargets(targets.value, 3).flatMap((group) => group.targets)
  return search(targets.value, typed).slice(0, 8)
})
const open = computed(() => offered.value.length > 0)
watch(offered, () => (selected.value = 0))

// Moving the line (Tab) redraws it elsewhere; leaving this field then must not also add it here.
let moving = false
let unmounted = false

function linkFor(target: LinkTarget): string {
  return markdownLink(dirnameOf(story.outline?.file ?? 'outlines/x.md'), target.file, target.title)
}

function choose(target: LinkTarget | undefined): void {
  if (!target) return
  editor?.insertLink(linkFor(target))
  query.value = null
}

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
    onListKey: (key) => {
      if (!open.value) return false
      if (key === 'down') selected.value = Math.min(selected.value + 1, offered.value.length - 1)
      else if (key === 'up') selected.value = Math.max(selected.value - 1, 0)
      else if (key === 'pick') choose(offered.value[selected.value])
      else query.value = null
      return true
    },
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
      <ul
        v-if="open && query"
        class="item-suggestions"
        role="listbox"
        :aria-label="t('link-search')"
        data-testid="item-suggestions"
        :style="{ left: `${query.x}px`, top: `${query.y + 4}px` }"
      >
        <li
          v-for="(target, index) in offered"
          :key="target.file"
          role="option"
          :aria-selected="index === selected"
          :class="{ selected: index === selected }"
          @mousedown.prevent
          @click="choose(target)"
        >
          <span dir="auto">{{ target.title }}</span>
          <span class="secondary">{{ t(`kind-${target.kind}`) }}</span>
        </li>
      </ul>
    </div>
    <span class="line-keys">{{ hint ?? (nests ? `${t('outline-line-keys')} · ${t('item-link-hint')}` : t('item-link-hint')) }}</span>
  </div>
</template>
