<script setup lang="ts">
import type { LinkTargetView } from '@plotdevice/contracts'
import { search } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, nextTick, ref, watch } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useShelfStore } from '../stores/shelf'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import InlineText from './InlineText.vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'

// Beside the page in Write: search, the outline's cards about this chapter, and opened or pinned
// pages. Using it never moves the editor's cursor or touches its undo history.
const props = defineProps<{ chapter: ProjectPath | null }>()
const api = useApi()
const shelf = useShelfStore()
const story = useStoryStore()
const project = useProjectStore()
const view = useViewStore()
const settings = useSettingsStore()
const t = settings.t
const query = ref('')
const results = computed(() => search(story.references, query.value).slice(0, 8))
const dragging = ref<ProjectPath | null>(null)

watch(
  () => [props.chapter, project.project?.root] as const,
  ([chapter]) => void shelf.refreshAbout(chapter),
  { immediate: true },
)
api.onEvent((event) => {
  if (event.kind === 'outline-changed' || event.kind === 'references-changed') void shelf.refreshAbout(props.chapter)
})

async function focusCard(file: ProjectPath): Promise<void> {
  await nextTick()
  document.querySelector<HTMLElement>(`[data-shelf-card="${CSS.escape(file)}"]`)?.focus()
}

function openTarget(target: LinkTargetView): void {
  if (target.kind === 'chapter') view.writeChapter(target.file)
  else if (target.kind === 'character' || target.kind === 'place' || target.kind === 'note')
    void shelf.open(target.file).then(() => focusCard(target.file))
}

function edit(file: ProjectPath): void {
  story.showing = { kind: 'page', file }
  view.workspace = 'story'
}

function menu(file: ProjectPath): MenuItem[] {
  const pinnedAt = shelf.pinned.indexOf(file)
  return [
    pinnedAt >= 0
      ? { key: 'unpin', label: t('shelf-unpin'), run: () => void shelf.unpin(file) }
      : { key: 'pin', label: t('shelf-pin'), run: () => void shelf.pin(file) },
    {
      key: 'move-earlier',
      label: t('item-move-earlier'),
      disabled: pinnedAt <= 0,
      run: () => void shelf.moveTo(file, pinnedAt - 1).then(() => focusCard(file)),
    },
    {
      key: 'move-later',
      label: t('item-move-later'),
      disabled: pinnedAt < 0 || pinnedAt >= shelf.pinned.length - 1,
      run: () => void shelf.moveTo(file, pinnedAt + 1).then(() => focusCard(file)),
    },
    { key: 'edit', label: t('shelf-edit'), group: 'edit', run: () => edit(file) },
    { key: 'close', label: t('shelf-close'), run: () => void shelf.close(file) },
  ]
}

function onCardKey(event: KeyboardEvent, file: ProjectPath): void {
  const at = shelf.pinned.indexOf(file)
  if (at < 0 || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
  event.preventDefault()
  void shelf.moveTo(file, at + (event.key === 'ArrowUp' ? -1 : 1)).then(() => focusCard(file))
}

function drop(target: ProjectPath): void {
  const file = dragging.value
  dragging.value = null
  if (file && file !== target) void shelf.moveTo(file, shelf.pinned.filter((entry) => entry !== file).indexOf(target))
}

function openResult(file: ProjectPath): void {
  query.value = ''
  void shelf.open(file).then(() => focusCard(file))
}
</script>

<template>
  <aside class="shelf" :aria-label="t('shelf')" data-testid="shelf">
    <label class="field">
      <span>{{ t('shelf-search') }}</span>
      <input
        v-model="query"
        type="search"
        dir="auto"
        data-testid="shelf-search"
        @keydown.enter.prevent="results[0] && openResult(results[0].file)"
      />
    </label>
    <ul v-if="query.trim() !== ''" class="results" data-testid="shelf-results">
      <li v-for="result in results" :key="result.file">
        <button type="button" class="chapter" @click="openResult(result.file)">
          <span dir="auto">{{ result.title }}</span
          ><span class="secondary">{{ t(`kind-${result.kind}`) }}</span>
        </button>
      </li>
      <li v-if="results.length === 0" class="secondary">{{ t('shelf-no-results') }}</li>
    </ul>

    <section v-if="shelf.aboutChapter.length > 0" class="shelf-section" data-testid="from-outline">
      <h2>{{ t('shelf-from-outline') }}</h2>
      <article v-for="(card, index) in shelf.aboutChapter" :key="index" class="outline-card shelf-outline-card">
        <p class="card-section secondary" dir="auto">
          {{ card.outlineTitle ?? card.outline }}{{ card.section ? ` · ${card.section}` : '' }}
        </p>
        <InlineText :text="card.card" />
        <ul v-if="card.links.length > 0" class="shelf-links">
          <li v-for="link in card.links" :key="link.file">
            <button type="button" class="link-button" @click="openTarget(link)">
              <span dir="auto">{{ link.title }}</span>
            </button>
            <span class="secondary">{{ t(`kind-${link.kind}`) }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section class="shelf-section">
      <p v-if="shelf.cards.length === 0" class="secondary">{{ t('shelf-empty') }}</p>
      <article
        v-for="file in shelf.cards"
        :key="file"
        class="outline-card shelf-card"
        :class="{ pinned: shelf.pinned.includes(file) }"
        tabindex="0"
        :data-shelf-card="file"
        :aria-label="shelf.pages[file]?.title ?? file"
        :draggable="shelf.pinned.includes(file)"
        @keydown.self="onCardKey($event, file)"
        @dragstart="dragging = file"
        @dragover.prevent
        @drop.prevent="drop(file)"
      >
        <div class="card-head">
          <span v-if="shelf.pinned.includes(file)" class="pin" role="img" :aria-label="t('shelf-pin')">📌</span>
          <strong class="card-text" dir="auto">{{ shelf.pages[file]?.title ?? file }}</strong>
          <MenuButton :label="t('shelf-card-actions', shelf.pages[file]?.title ?? file)" :items="menu(file)" />
        </div>
        <p v-if="shelf.pages[file]?.description" class="shelf-description" dir="auto">
          <InlineText :text="shelf.pages[file]?.description ?? ''" />
        </p>
        <details v-if="shelf.pages[file]?.details">
          <summary>{{ t('shelf-details') }}</summary>
          <pre dir="auto">{{ shelf.pages[file]?.details }}</pre>
        </details>
      </article>
    </section>
  </aside>
</template>
