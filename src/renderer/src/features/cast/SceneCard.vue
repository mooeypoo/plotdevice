<script setup lang="ts">
import { computed, watch } from 'vue'
import { useOutlineStore } from '../../app/outline-store'
import { createDocumentReader } from '../../app/document-reader'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useEditorLinks } from '../../app/use-editor-links'
import { useLiveDraft } from '../../app/use-live-draft'
import { useSidePanelNavigation } from '../../app/use-side-panel-navigation'
import { useWritingChapter } from '../../app/use-writing-chapter'
import { linkText } from '../../shared/link-text'
import { outlineLinesFor } from './outline-mentions'

const chapter = useWritingChapter()
const outlines = useOutlineStore()
const { editDetails } = useSidePanelNavigation()
const links = useEditorLinks()
const language = useUiLanguageStore()

const properties = computed(() => {
  const read = chapter.properties.value
  return read?.kind === 'manuscript' ? read.value : null
})
const list = (items: readonly string[]): string =>
  items.map(linkText).join(language.t('cards-list-separator'))

/** The project's current outline: the one chosen beside the draft, or the first. */
const outlinePath = computed(() => outlines.currentPath)
const outline = createDocumentReader()
watch(
  outlinePath,
  (path) => {
    if (path === null) outline.clear()
    else outline.open(path)
  },
  { immediate: true }
)
watch(
  () => outlines.revision,
  () => void outline.reload()
)
const { text: outlineText } = useLiveDraft(outline.path, outline.text)

const outlineLines = computed(() => {
  const chapterPath = chapter.path.value
  const from = outlinePath.value
  if (chapterPath === null || from === null || outlineText.value === null) return []
  return outlineLinesFor(outlineText.value, (link) => links.linkMeans(link, chapterPath, from))
})

function editProperties(): void {
  const path = chapter.path.value
  if (path !== null) void editDetails(path)
}
</script>

<template>
  <section class="scene-card" :aria-label="language.t('scene-card-title')">
    <p v-if="chapter.path.value === null" class="empty">
      {{ language.t('scene-card-no-chapter') }}
    </p>
    <template v-else>
      <header>
        <h3 dir="auto">{{ chapter.title.value ?? chapter.path.value }}</h3>
        <button type="button" class="quiet edit" @click="editProperties">
          {{ language.t('scene-card-edit') }}
        </button>
      </header>
      <dl v-if="properties" class="fields">
        <template v-if="properties.status">
          <dt>{{ language.t('inspector-status') }}</dt>
          <dd dir="auto">{{ properties.status }}</dd>
        </template>
        <template v-if="properties.pov.length > 0">
          <dt>{{ language.t('inspector-pov') }}</dt>
          <dd dir="auto">{{ list(properties.pov) }}</dd>
        </template>
        <template v-if="properties.threads.length > 0">
          <dt>{{ language.t('inspector-threads') }}</dt>
          <dd dir="auto">{{ list(properties.threads) }}</dd>
        </template>
      </dl>
      <p v-if="properties?.synopsis" class="synopsis" dir="auto">{{ properties.synopsis }}</p>

      <h4>{{ language.t('scene-card-in-outline') }}</h4>
      <ul v-if="outlineLines.length > 0" class="outline-lines">
        <li v-for="(line, index) in outlineLines" :key="index" dir="auto">{{ line }}</li>
      </ul>
      <p v-else class="empty">{{ language.t('scene-card-no-outline-lines') }}</p>
    </template>
  </section>
</template>

<style scoped>
.scene-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-5) var(--space-5) var(--space-7);
  font-size: var(--text-body);
}

header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

h3 {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: var(--text-title);
}

h4 {
  margin: var(--space-3) 0 0;
  color: var(--text-muted);
  font-size: var(--text-caption);
  font-weight: normal;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.edit {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-caption);
}

.fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-1) var(--space-3);
  margin: 0;
}

dt {
  color: var(--text-muted);
}

dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.synopsis {
  margin: 0;
  font-family: var(--font-prose);
  line-height: 1.6;
}

.outline-lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding-inline-start: var(--space-5);
}

.empty {
  margin: 0;
  color: var(--text-muted);
}
</style>
