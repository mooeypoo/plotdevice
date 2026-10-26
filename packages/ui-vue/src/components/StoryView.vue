<script setup lang="ts">
import type { OutlineViewKind, ProjectView, ReferenceKind } from '@plotdevice/contracts'
import { computed } from 'vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'
import { useOutlineActions } from '../composables/use-outline-actions'
import { usePrompt } from '../composables/use-prompt'
import { useVersions } from '../composables/use-versions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import KeptAsWritten from './KeptAsWritten.vue'
import ManuscriptOutline from './ManuscriptOutline.vue'
import OutlineBoard from './OutlineBoard.vue'
import OutlineCards from './OutlineCards.vue'
import OutlineList from './OutlineList.vue'
import ReferencePage from './ReferencePage.vue'

defineProps<{ project: ProjectView }>()
const story = useStoryStore()
const settings = useSettingsStore()
const view = useViewStore()
const actions = useOutlineActions()
const { ask } = usePrompt()
const versions = useVersions()
const t = settings.t
const views: OutlineViewKind[] = ['board', 'outline', 'cards']
const kinds: ReferenceKind[] = ['character', 'place', 'note']
const pagesOf = (kind: ReferenceKind) => story.references.filter((reference) => reference.kind === kind)
const showingOutline = computed(() => story.showing.kind === 'outline')

/** Undo, rename and versions: under ⋯ beside the views, so the bar above the outline stays quiet. */
const outlineItems = computed<MenuItem[]>(() => {
  const outline = story.outline
  if (!outline) return []
  return [
    {
      key: 'outline-undo',
      label: t('outline-undo'),
      hint: navigator.platform.startsWith('Mac') ? '⌘Z' : 'Ctrl+Z',
      disabled: !outline.canUndo,
      run: () => void story.undo(),
    },
    { key: 'outline-rename', label: t('outline-rename-title'), run: () => void actions.renameOutline() },
    { key: 'outline-versions', label: t('outline-versions'), run: () => versions.show(outline.file, outline.title ?? outline.file) },
  ]
})

async function newOutline(): Promise<void> {
  const title = await ask(t('prompt-outline-title'))
  if (title) await story.create(title)
}

async function newPage(kind: ReferenceKind): Promise<void> {
  const title = await ask(t('prompt-reference-title'))
  if (title) await story.createReference(kind, title)
}
</script>

<template>
  <div class="story" data-testid="story">
    <nav class="navigator" :aria-label="t('workspace-story')">
      <h2>{{ t('story-outlines') }}</h2>
      <p v-if="story.outlines.length === 0" class="secondary">{{ t('reference-none') }}</p>
      <ul>
        <li
          v-for="entry in story.outlines"
          :key="entry.file"
          class="row chapter-row"
          :class="{ current: showingOutline && story.outline?.file === entry.file }"
        >
          <button
            type="button"
            class="chapter"
            :data-outline="entry.file"
            :aria-current="showingOutline && story.outline?.file === entry.file ? 'page' : undefined"
            @click="story.open(entry.file)"
          >
            <span dir="auto">{{ entry.title ?? entry.file }}</span>
          </button>
        </li>
      </ul>
      <div class="add-links">
        <button type="button" class="add-link" data-testid="new-outline" @click="newOutline">{{ t('story-new-outline') }}</button>
      </div>

      <section v-for="kind in kinds" :key="kind" class="navigator-section" :data-testid="`pages-${kind}`">
        <h2>{{ t(`story-${kind}`) }}</h2>
        <ul>
          <li
            v-for="page in pagesOf(kind)"
            :key="page.file"
            class="row chapter-row"
            :class="{ current: story.showing.kind === 'page' && story.showing.file === page.file }"
          >
            <button type="button" class="chapter" :data-page="page.file" @click="story.showing = { kind: 'page', file: page.file }">
              <span dir="auto">{{ page.title }}</span>
            </button>
          </li>
        </ul>
        <div class="add-links">
          <button type="button" class="add-link" :data-testid="`new-${kind}`" @click="newPage(kind)">{{ t(`new-${kind}`) }}</button>
        </div>
      </section>

      <ul class="navigator-section">
        <li class="row chapter-row" :class="{ current: story.showing.kind === 'manuscript' }">
          <button type="button" class="chapter" data-testid="show-manuscript" @click="story.showing = { kind: 'manuscript' }">
            {{ t('story-manuscript') }}
          </button>
        </li>
      </ul>
    </nav>

    <section class="desk">
      <ManuscriptOutline v-if="story.showing.kind === 'manuscript'" class="story-page" :project="project" />
      <ReferencePage v-else-if="story.showing.kind === 'page'" :key="story.showing.file" class="story-page" :file="story.showing.file" />
      <template v-else-if="story.outline">
        <div class="story-head">
          <button
            type="button"
            class="outline-title"
            dir="auto"
            :title="t('outline-rename-title')"
            data-testid="outline-title"
            @click="actions.renameOutline"
          >
            {{ story.outline.title ?? story.outline.file }}
          </button>
          <div class="segmented" role="group" :aria-label="t('view-switch')">
            <button
              v-for="kind in views"
              :key="kind"
              type="button"
              :aria-pressed="view.outlineView === kind"
              :data-testid="`view-${kind}`"
              @click="view.outlineView = kind"
            >
              {{ t(`view-${kind}`) }}
            </button>
          </div>
          <MenuButton :label="t('outline-actions')" :items="outlineItems" button-class="icon-button" align="end" testid="outline-menu" />
        </div>
        <div class="story-page">
          <p v-if="story.outline.invalidDetails" class="warning" role="status">{{ t('invalid-details') }}</p>
          <KeptAsWritten v-for="(block, i) in story.outline.preamble" :key="`pre-${i}`" :text="block" />
          <div v-if="story.outline.sections.length === 0" class="empty-outline">
            <p>{{ t('outline-empty') }}</p>
          </div>
          <OutlineBoard v-if="view.outlineView === 'board'" :outline="story.outline" />
          <OutlineList v-else-if="view.outlineView === 'outline'" :outline="story.outline" />
          <OutlineCards v-else :outline="story.outline" />
        </div>
      </template>
      <div v-else class="story-page">
        <p class="secondary">{{ t('story-no-outlines') }}</p>
      </div>
    </section>
  </div>
</template>
