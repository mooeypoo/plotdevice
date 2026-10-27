<script setup lang="ts">
import type { LinkTargetView } from '@plotdevice/contracts'
import type { ReferenceSummaryView } from '@plotdevice/contracts'
import { groupByTags, partOf, search, tagRow, tagSuggestions } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, nextTick, ref, watch } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useShelfStore } from '../stores/shelf'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import AppIcon from './AppIcon.vue'
import InlineText from './InlineText.vue'
import PageDetails from './PageDetails.vue'
import TagFilter from './TagFilter.vue'
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
const searching = ref(false)
/** Typed: the best matches. Not yet: pages to start from, characters first, leaving out what's open. */
const browsing = computed(() => query.value.trim() === '')
const candidates = computed(() => {
  if (!browsing.value) return search(story.references, query.value)
  const order = ['character', 'place', 'note']
  return story.references
    .filter((reference) => !shelf.cards.includes(reference.file))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
})
/** The part being written: the shelf's chosen tags are remembered for each (Milestone 12, decision 3). */
const part = computed(() => (project.project && props.chapter ? partOf(project.project, props.chapter) : ''))
const chosen = computed({
  get: () => shelf.chosenTags(part.value),
  set: (tags: string[]) => void shelf.chooseTags(part.value, tags),
})
const tags = computed(() => tagRow(story.references, settings.locale))
/** Tags whose names match what was typed, offered to choose. */
const matchingTags = computed(() => (browsing.value ? [] : tagSuggestions(tags.value, chosen.value, query.value, 3)))
const othersOpen = ref(false)
/** The chosen tags' pages first, one group per tag; the rest after, folded until something is typed. */
const sections = computed(() => {
  const { groups, others } = groupByTags(candidates.value, chosen.value)
  const rest = { key: 'others', label: groups.length > 0 ? t('tag-everyone-else', String(others.length)) : null, pages: others.slice(0, 8) }
  const folded = groups.length > 0 && browsing.value && !othersOpen.value
  return [
    ...groups.map((group) => ({ key: `tag:${group.tag}`, label: group.tag as string | null, pages: group.pages })),
    ...(others.length > 0 ? [{ ...rest, folds: groups.length > 0 && browsing.value, pages: folded ? [] : rest.pages }] : []),
  ] as { key: string; label: string | null; pages: ReferenceSummaryView[]; folds?: boolean }[]
})
const results = computed(() => sections.value.flatMap((section) => section.pages))

function chooseTag(tag: string): void {
  chosen.value = [...chosen.value, tag]
  query.value = ''
}

function onFindFocusOut(event: FocusEvent): void {
  searching.value = (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)
}
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
    <div class="shelf-find" @focusin="searching = true" @focusout="onFindFocusOut">
      <label class="field shelf-search">
        <h2>{{ t('shelf') }}</h2>
        <input
          v-model="query"
          type="search"
          dir="auto"
          :placeholder="t('shelf-search')"
          :aria-label="t('shelf-search')"
          data-testid="shelf-search"
          @keydown.enter.prevent="results[0] && openResult(results[0].file)"
        />
      </label>
      <!-- Only while finding: the row matters for the list it groups, and the page stays calm otherwise. -->
      <TagFilter v-if="!browsing || searching" v-model:chosen="chosen" :tags="tags" manage />
      <div v-if="!browsing || searching" class="results" data-testid="shelf-results">
        <div v-if="matchingTags.length > 0" class="tag-filter" data-testid="matching-tags">
          <button
            v-for="tag in matchingTags"
            :key="tag"
            type="button"
            class="tag-pill tag-choice"
            :aria-pressed="false"
            dir="auto"
            @mousedown.prevent
            @click="chooseTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
        <template v-for="section in sections" :key="section.key">
          <h3 v-if="section.label && !section.folds" class="group-label" dir="auto">{{ section.label }}</h3>
          <button
            v-else-if="section.folds"
            type="button"
            class="group-label group-toggle"
            :aria-expanded="othersOpen"
            data-testid="shelf-everyone-else"
            @click="othersOpen = !othersOpen"
          >
            {{ section.label }}
          </button>
          <ul :data-group="section.key">
            <li v-for="result in section.pages" :key="result.file">
              <button type="button" class="chapter" @mousedown.prevent @click="openResult(result.file)">
                <span dir="auto">{{ result.title }}</span
                ><span class="secondary">{{ t(`kind-${result.kind}`) }}</span>
              </button>
            </li>
          </ul>
        </template>
        <p v-if="results.length === 0 && !browsing" class="secondary">{{ t('shelf-no-results') }}</p>
      </div>
    </div>

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
          <strong class="card-text" dir="auto">{{ shelf.pages[file]?.title ?? file }}</strong>
          <button
            type="button"
            class="icon-button pin-button"
            :aria-pressed="shelf.pinned.includes(file)"
            :aria-label="shelf.pinned.includes(file) ? t('shelf-unpin') : t('shelf-pin')"
            :title="shelf.pinned.includes(file) ? t('shelf-unpin') : t('shelf-pin')"
            data-testid="shelf-pin"
            @click="shelf.pinned.includes(file) ? shelf.unpin(file) : shelf.pin(file)"
          >
            <AppIcon name="pin" />
          </button>
          <MenuButton :label="t('shelf-card-actions', shelf.pages[file]?.title ?? file)" :items="menu(file)" />
        </div>
        <p v-if="shelf.pages[file]?.description" class="shelf-description" dir="auto">
          <InlineText :text="shelf.pages[file]?.description ?? ''" />
        </p>
        <details v-if="shelf.pages[file]?.details">
          <summary>{{ t('shelf-details') }}</summary>
          <PageDetails :markdown="shelf.pages[file]?.details ?? ''" />
        </details>
      </article>
    </section>
  </aside>
</template>
