<script setup lang="ts">
import type { OutlineViewKind, ProjectView, ReferenceKind } from '@plotdevice/contracts'
import { computed, onBeforeUnmount, onMounted } from 'vue'
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
import OutlineList from './OutlineList.vue'
import ReferencePage from './ReferencePage.vue'
import WorldGallery from './WorldGallery.vue'

defineProps<{ project: ProjectView }>()
const story = useStoryStore()
const settings = useSettingsStore()
const view = useViewStore()
const actions = useOutlineActions()
const { ask } = usePrompt()
const versions = useVersions()
const t = settings.t
const views: OutlineViewKind[] = ['board', 'outline']
const kinds: ReferenceKind[] = ['character', 'place', 'note']
const pagesOf = (kind: ReferenceKind) => story.references.filter((reference) => reference.kind === kind)
const showingOutline = computed(() => story.showing.kind === 'outline')
/** The World entry to mark: the gallery shown, or the kind of the page shown. */
const currentKind = computed<ReferenceKind | null>(() => {
  const showing = story.showing
  if (showing.kind === 'gallery') return showing.of
  if (showing.kind === 'page') return story.references.find((reference) => reference.file === showing.file)?.kind ?? null
  return null
})

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

/** Ctrl+Z (⌘Z) undoes the last outline change, unless the keyboard is in a text field or page editor. */
function onKey(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"], .page-editor')) return
  if (story.showing.kind !== 'outline' || !story.outline?.canUndo) return
  event.preventDefault()
  void story.undo()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="story" data-testid="story">
    <nav class="navigator" :aria-label="t('workspace-story')">
      <section class="story-group" data-testid="plot">
        <h2 class="group-heading">{{ t('story-plot') }}</h2>
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
        <ul>
          <li class="row chapter-row" :class="{ current: story.showing.kind === 'manuscript' }">
            <button
              type="button"
              class="chapter"
              data-testid="show-manuscript"
              :aria-current="story.showing.kind === 'manuscript' ? 'page' : undefined"
              @click="story.showing = { kind: 'manuscript' }"
            >
              {{ t('story-manuscript') }}
            </button>
          </li>
        </ul>
      </section>

      <section class="story-group" data-testid="world">
        <h2 class="group-heading">{{ t('story-world') }}</h2>
        <ul>
          <li v-for="kind in kinds" :key="kind" class="row chapter-row" :class="{ current: currentKind === kind }">
            <button
              type="button"
              class="chapter"
              :data-gallery="kind"
              :aria-current="story.showing.kind === 'gallery' && story.showing.of === kind ? 'page' : undefined"
              @click="story.showing = { kind: 'gallery', of: kind }"
            >
              <span>{{ t(`story-${kind}`) }}</span>
              <span class="count" :aria-label="t('gallery-pages', pagesOf(kind).length)">{{ pagesOf(kind).length }}</span>
            </button>
          </li>
        </ul>
      </section>
    </nav>

    <section class="desk">
      <ManuscriptOutline v-if="story.showing.kind === 'manuscript'" class="story-page" :project="project" />
      <WorldGallery v-else-if="story.showing.kind === 'gallery'" :key="story.showing.of" :kind="story.showing.of" />
      <ReferencePage v-else-if="story.showing.kind === 'page'" :key="story.showing.file" class="story-page" :file="story.showing.file" />
      <template v-else-if="story.outline">
        <div class="story-head outline-head">
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
          <OutlineList v-else :outline="story.outline" />
        </div>
      </template>
      <div v-else class="story-page">
        <p class="secondary">{{ t('story-no-outlines') }}</p>
      </div>
    </section>
  </div>
</template>
