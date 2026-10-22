<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LinkTargetDto } from '../../../../contract/dtos'
import { isolate } from '../../shared/isolate'
import type { LinkAt } from '../../shared/link-at'
import type { LinkCompletionTarget } from './link-completion'
import { createProseEditor, type ProseEditor } from './prose-editor'
import type { ProseEditorCopy } from './prose-editor-copy'
import { useWritingPreferencesStore } from '../../app/writing-preferences-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useDocumentView } from './use-document-view'

const props = defineProps<{
  /** The text when the editor mounts. Remount (change the key) to load different text. */
  initialText: string
  documentId?: string | undefined
  readOnly: boolean
  focusMode: boolean
  linkTargets: readonly LinkTargetDto[]
  completions: readonly LinkCompletionTarget[]
}>()

const emit = defineEmits<{
  change: [text: string]
  blur: []
  openLink: [link: LinkAt]
}>()

const host = ref<HTMLElement | null>(null)
let editor: ProseEditor | undefined
let initialFocusPending = true
const writingPreferences = useWritingPreferencesStore()
const language = useUiLanguageStore()
const copy = computed<ProseEditorCopy>(() => ({
  accessibleLabel: language.t('editor-prose-label'),
  placeholder: language.t('editor-placeholder'),
  linkTooltip: (target, embed) =>
    language.t(embed ? 'editor-embed-tooltip' : 'editor-link-tooltip', isolate(target))
}))
const documentView = useDocumentView(
  props.documentId,
  () => host.value,
  () => editor
)

function focusInitially(): void {
  if (props.readOnly || !initialFocusPending) return
  initialFocusPending = false
  editor?.focus()
  documentView.restoreScroll(props.initialText)
}

watch(
  () => [writingPreferences.fontSize, writingPreferences.lineWidth],
  () => {
    editor?.remeasure()
  },
  { flush: 'post' }
)

watch(
  () => writingPreferences.writingDirection,
  (direction) => editor?.setWritingDirection(direction)
)

watch(copy, (nextCopy) => editor?.setCopy(nextCopy))

onMounted(() => {
  if (host.value === null) return
  editor = createProseEditor(host.value, {
    text: props.initialText,
    writingDirection: writingPreferences.writingDirection,
    copy: copy.value,
    state: documentView.state,
    readOnly: props.readOnly,
    focusMode: props.focusMode,
    linkTargets: props.linkTargets,
    onChange: (text) => {
      emit('change', text)
    },
    onBlur: () => {
      emit('blur')
    },
    completions: () => props.completions,
    onOpenLink: (link) => {
      emit('openLink', link)
    }
  })
  documentView.restoreScroll(props.initialText)
  focusInitially()
})

watch(
  () => props.readOnly,
  (on) => {
    editor?.setReadOnly(on)
    focusInitially()
  }
)

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
