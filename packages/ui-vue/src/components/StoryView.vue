<script setup lang="ts">
import type { OutlineViewKind, ProjectView } from '@plotdevice/contracts'
import { ref } from 'vue'
import { useOutlineActions } from '../composables/use-outline-actions'
import { usePrompt } from '../composables/use-prompt'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import KeptAsWritten from './KeptAsWritten.vue'
import ManuscriptOutline from './ManuscriptOutline.vue'
import OutlineBoard from './OutlineBoard.vue'
import OutlineCards from './OutlineCards.vue'
import OutlineList from './OutlineList.vue'

defineProps<{ project: ProjectView }>()
const story = useStoryStore()
const store = useProjectStore()
const settings = useSettingsStore()
const view = useViewStore()
const actions = useOutlineActions()
const { ask } = usePrompt()
const t = settings.t
const showingManuscript = ref(false)
const views: OutlineViewKind[] = ['board', 'outline', 'cards']

async function newOutline(): Promise<void> {
  const title = await ask(t('prompt-outline-title'))
  if (title) {
    showingManuscript.value = false
    await story.create(title)
  }
}

function openOutline(file: Parameters<typeof story.open>[0]): void {
  showingManuscript.value = false
  void story.open(file)
}
</script>

<template>
  <div class="story" data-testid="story">
    <nav class="navigator" :aria-label="t('story-outlines')">
      <h2>{{ t('story-outlines') }}</h2>
      <p v-if="story.outlines.length === 0" class="secondary">{{ t('story-no-outlines') }}</p>
      <ul>
        <li v-for="entry in story.outlines" :key="entry.file" class="row chapter-row" :class="{ current: !showingManuscript && story.outline?.file === entry.file }">
          <button type="button" class="chapter" :data-outline="entry.file" :aria-current="!showingManuscript && story.outline?.file === entry.file ? 'page' : undefined" @click="openOutline(entry.file)">
            <span dir="auto">{{ entry.title ?? entry.file }}</span>
          </button>
        </li>
      </ul>
      <div class="actions start">
        <button type="button" data-testid="new-outline" @click="newOutline">{{ t('story-new-outline') }}</button>
      </div>
      <ul class="navigator-section">
        <li class="row chapter-row" :class="{ current: showingManuscript }">
          <button type="button" class="chapter" data-testid="show-manuscript" @click="showingManuscript = true">{{ t('story-manuscript') }}</button>
        </li>
      </ul>
    </nav>

    <section class="desk">
      <ManuscriptOutline v-if="showingManuscript" class="story-page" :project="project" />
      <template v-else-if="story.outline">
        <div class="toolbar">
          <h1 class="outline-title" dir="auto">{{ story.outline.title ?? story.outline.file }}</h1>
          <button type="button" @click="actions.renameOutline">{{ t('outline-rename-title') }}</button>
          <div class="segmented" role="group" :aria-label="t('view-switch')">
            <button v-for="kind in views" :key="kind" type="button" :aria-pressed="view.outlineView === kind" :data-testid="`view-${kind}`" @click="view.outlineView = kind">
              {{ t(`view-${kind}`) }}
            </button>
          </div>
          <button type="button" :disabled="!story.outline.canUndo" data-testid="outline-undo" @click="story.undo">{{ t('outline-undo') }}</button>
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
      <footer class="status-line">
        <span></span>
        <span v-if="store.notice" class="notice" role="alert">
          {{ t(store.notice.key, ...store.notice.params) }}
          <button type="button" class="link-button" :aria-label="t('prompt-cancel')" @click="store.notice = null">×</button>
        </span>
      </footer>
    </section>
  </div>
</template>
