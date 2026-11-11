<script setup lang="ts">
import type { ProjectPath } from '@plotdevice/shared'
import { onMounted, ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'

/**
 * The chapter's title above the page, which the author can click and retype (Milestone 28). Enter
 * saves and goes on into the text, Esc puts the old name back, clicking away saves. It saves once,
 * when the author is done, and keeps its own undo, apart from the text's.
 */
const props = defineProps<{
  file: ProjectPath
  /** The title as it is now; empty for an untitled poem. */
  title: string
  /** Shown faintly while the title is empty: "Untitled poem", in the book's language. */
  placeholder: string
  /** Only a poem can be left without a title (ADR 0013). */
  mayBeEmpty: boolean
  /** Renames the chapter; false when that failed (and the author has been told). */
  rename: (file: ProjectPath, title: string) => Promise<boolean>
}>()
const emit = defineEmits<{
  /** Done with the title: the cursor goes on into the text. */
  done: []
}>()
const t = useSettingsStore().t

const field = ref<HTMLElement | null>(null)
/** The chapter being renamed, kept from the moment the title is clicked, in case another chapter opens. */
let editing: { file: ProjectPath; was: string; mayBeEmpty: boolean } | null = null

const show = (text: string): void => {
  if (field.value && field.value.textContent !== text) field.value.textContent = text
}
onMounted(() => show(props.title))
// Never overwrite what the author is typing.
watch(
  () => [props.file, props.title] as const,
  ([, title]) => {
    if (!editing) show(title)
  },
)

function begin(): void {
  editing = { file: props.file, was: props.title, mayBeEmpty: props.mayBeEmpty }
}

async function save(): Promise<void> {
  const started = editing
  editing = null
  if (!started) return
  // A title is one line: pasted line breaks and runs of spaces become single spaces.
  const next = (field.value?.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (next === started.was || (next === '' && !started.mayBeEmpty)) {
    show(started.was)
    return
  }
  show(next)
  const renamed = await props.rename(started.file, next)
  // Nothing changed: the old name comes back, unless the author is already typing again.
  if (!renamed && !editing && props.file === started.file) show(props.title)
}

function onKey(event: KeyboardEvent): void {
  if (event.isComposing) return
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('done')
    field.value?.blur()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (editing) show(editing.was)
    emit('done')
    field.value?.blur()
  }
}
</script>

<template>
  <span
    ref="field"
    class="title-field"
    contenteditable="plaintext-only"
    role="textbox"
    spellcheck="true"
    :aria-label="t('chapter-title-field')"
    :aria-placeholder="placeholder || undefined"
    :data-placeholder="placeholder"
    data-testid="chapter-title-field"
    @focus="begin"
    @blur="void save()"
    @keydown="onKey"
  ></span>
</template>
