<script setup lang="ts">
import { RELATIONSHIP_HEADINGS, type ProjectPath } from '@plotdevice/shared'
import { computed, onMounted, ref, watch } from 'vue'
import { useChapterWriting } from '../composables/use-chapter-writing'
import { usePrompt } from '../composables/use-prompt'
import { useVersions } from '../composables/use-versions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import ConflictDialog from './ConflictDialog.vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'
import PageConnections from './PageConnections.vue'
import TagPills from './TagPills.vue'

// One character, place or note: its name, and its text in the same editor as chapters, with the same
// autosave and conflict protection. Write's place in the book is left alone.
const props = defineProps<{ file: ProjectPath }>()
const story = useStoryStore()
const settings = useSettingsStore()
const { ask } = usePrompt()
const versions = useVersions()
const t = settings.t
const host = ref<HTMLElement | null>(null)
// The relationships section is listed beside the page, so in the text it folds into one line.
const page = useChapterWriting(host, {
  remembersPosition: false,
  foldedSection: { headings: Object.values(RELATIONSHIP_HEADINGS), label: () => t('relationships-folded') },
})
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

const pageItems = computed<MenuItem[]>(() => [
  { key: 'rename-reference', label: t('reference-rename'), run: () => void rename() },
  { key: 'rename-page-file', label: t('reference-rename-file'), run: () => void renameFile() },
  { key: 'page-versions', label: t('versions'), run: () => versions.show(props.file, summary.value?.title ?? props.file) },
])

onMounted(() => void page.open(props.file))
watch(
  () => props.file,
  (file) => void page.open(file),
)
</script>

<template>
  <article class="reference-page" data-testid="reference-page">
    <button
      v-if="summary"
      type="button"
      class="crumb"
      data-testid="back-to-gallery"
      :aria-label="t('story-back-to', t(`story-${summary.kind}`))"
      @click="story.showing = { kind: 'gallery', of: summary.kind }"
    >
      {{ t(`story-${summary.kind}`) }}
    </button>
    <div class="toolbar">
      <h1 class="outline-title" dir="auto">{{ summary?.title ?? file }}</h1>
      <MenuButton :label="t('page-actions')" :items="pageItems" button-class="icon-button" testid="page-menu" />
    </div>
    <p v-if="summary && summary.aka.length > 0" class="secondary" dir="auto">{{ t('reference-aka', summary.aka.join(', ')) }}</p>
    <TagPills v-if="summary && !summary.invalidDetails" :tags="summary.tags" @change="(tags) => story.setTags(file, tags)" />
    <div class="page-layout">
      <div class="page-main">
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
      </div>
      <PageConnections v-if="summary" :page="summary" />
    </div>
    <ConflictDialog
      v-if="page.status.value === 'conflict'"
      :chapter-name="summary?.title ?? file"
      :busy="page.resolving.value"
      @choose="page.resolveConflict"
    />
  </article>
</template>
