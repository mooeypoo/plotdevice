<script setup lang="ts">
import type { ProjectPath } from '@plotdevice/shared'
import { computed, onMounted, ref, watch } from 'vue'
import { useChapterWriting } from '../composables/use-chapter-writing'
import { usePrompt } from '../composables/use-prompt'
import { useVersions } from '../composables/use-versions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import ConflictDialog from './ConflictDialog.vue'

// One character, place or note: its name, and its text in the same editor as chapters, with the same
// autosave and conflict protection. Write's place in the book is left alone.
const props = defineProps<{ file: ProjectPath }>()
const story = useStoryStore()
const settings = useSettingsStore()
const { ask } = usePrompt()
const versions = useVersions()
const t = settings.t
const host = ref<HTMLElement | null>(null)
const page = useChapterWriting(host, { remembersPosition: false })
const summary = computed(() => story.references.find((reference) => reference.file === props.file) ?? null)

async function renameFile(): Promise<void> {
  const current = props.file.split('/').at(-1)?.replace(/\.md$/, '') ?? ''
  const name = await ask(t('prompt-file-name-page'), current)
  if (name && name !== current) await story.renameReferenceFile(props.file, name)
}

async function rename(): Promise<void> {
  const title = await ask(t('prompt-reference-title'), summary.value?.title ?? '')
  if (title) await story.renameReference(props.file, title)
}

onMounted(() => void page.open(props.file))
watch(
  () => props.file,
  (file) => void page.open(file),
)
</script>

<template>
  <article class="reference-page" data-testid="reference-page">
    <div class="toolbar">
      <h1 class="outline-title" dir="auto">{{ summary?.title ?? file }}</h1>
      <button type="button" data-testid="rename-reference" @click="rename">{{ t('reference-rename') }}</button>
      <button type="button" data-testid="rename-page-file" @click="renameFile">{{ t('reference-rename-file') }}</button>
      <button type="button" data-testid="page-versions" @click="versions.show(file, summary?.title ?? file)">{{ t('versions') }}</button>
    </div>
    <p v-if="summary && summary.aka.length > 0" class="secondary" dir="auto">{{ t('reference-aka', summary.aka.join(', ')) }}</p>
    <p class="secondary hint">{{ t('reference-hint') }}</p>
    <p v-if="page.state.value === 'unreadable'" class="warning" role="alert">{{ t('chapter-unreadable') }}</p>
    <p v-else-if="page.state.value === 'missing'" class="warning" role="alert">{{ t('chapter-missing') }}</p>
    <div class="paper size-medium width-medium">
      <div
        v-show="page.state.value === 'ready' || page.state.value === 'loading'"
        ref="host"
        class="editor-host page-editor"
        data-testid="page-editor"
      ></div>
    </div>
    <p class="status-line">
      <span role="status" data-testid="page-save-status">{{ page.status.value ? t(`save-${page.status.value}`) : '' }}</span>
    </p>
    <ConflictDialog
      v-if="page.status.value === 'conflict'"
      :chapter-name="summary?.title ?? file"
      :busy="page.resolving.value"
      @choose="page.resolveConflict"
    />
  </article>
</template>
