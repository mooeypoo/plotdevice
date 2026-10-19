<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LinkTargetDto } from '../../../../contract/dtos'
import { createProseEditor, type ProseEditor } from './prose-editor'

const props = defineProps<{
  /** The text when the editor mounts. Remount (change the key) to load different text. */
  initialText: string
  readOnly: boolean
  focusMode: boolean
  linkTargets: readonly LinkTargetDto[]
}>()

const emit = defineEmits<{
  change: [text: string]
  blur: []
}>()

const host = ref<HTMLElement | null>(null)
let editor: ProseEditor | undefined

onMounted(() => {
  if (host.value === null) return
  editor = createProseEditor(host.value, {
    text: props.initialText,
    readOnly: props.readOnly,
    focusMode: props.focusMode,
    linkTargets: props.linkTargets,
    onChange: (text) => {
      emit('change', text)
    },
    onBlur: () => {
      emit('blur')
    }
  })
  if (!props.readOnly) editor.focus()
})

watch(
  () => props.focusMode,
  (on) => {
    editor?.setFocusMode(on)
  }
)

watch(
  () => props.linkTargets,
  (targets) => {
    editor?.setLinkTargets(targets)
  }
)

onBeforeUnmount(() => {
  editor?.destroy()
})
</script>

<template>
  <div ref="host" class="chapter-editor"></div>
</template>

<style scoped>
.chapter-editor {
  min-height: 100%;
}
</style>
