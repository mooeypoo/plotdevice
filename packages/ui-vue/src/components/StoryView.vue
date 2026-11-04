<script setup lang="ts">
import type { ProjectView, ReferenceKind } from '@plotdevice/contracts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'
import { useKinds } from '../composables/use-kinds'
import { useOutlineActions } from '../composables/use-outline-actions'
import { usePanelWidths } from '../composables/use-panel-widths'
import { usePrompt } from '../composables/use-prompt'
import { useVersions } from '../composables/use-versions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { textViewKeys, useViewStore, type OutlineMode } from '../stores/view'
import AppIcon from './AppIcon.vue'
import EmptyState from './EmptyState.vue'
import ItemHeader from './ItemHeader.vue'
import KeptAsWritten from './KeptAsWritten.vue'
import ManuscriptOutline from './ManuscriptOutline.vue'
import OutlineBoard from './OutlineBoard.vue'
import OutlineList from './OutlineList.vue'
import OutlineText from './OutlineText.vue'
import ReferencePage from './ReferencePage.vue'
import ResizeHandle from './ResizeHandle.vue'
import WorldGallery from './WorldGallery.vue'

defineProps<{ project: ProjectView }>()
const story = useStoryStore()
const settings = useSettingsStore()
const view = useViewStore()
const actions = useOutlineActions()
const { ask } = usePrompt()
const versions = useVersions()
const t = settings.t
const panels = usePanelWidths()
const views: OutlineMode[] = ['board', 'outline', 'text']
// The book's kinds of pages (ADR 0011), and folders of pages it doesn't list ("Not sorted yet").
const kinds = useKinds()
const pagesOf = (kind: ReferenceKind) => story.references.filter((reference) => reference.kind === kind)
const showingOutline = computed(() => story.showing.kind === 'outline')
/** Plot and World fold, for a long list of kinds (Milestone 17); for this session only. */
const plotOpen = ref(true)
const worldOpen = ref(true)
const sidebarShown = computed(() => !view.navigatorHidden && !view.focusMode)
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
    // In Text, the editor has its own undo, by the keystroke.
    ...(view.outlineView === 'text'
      ? []
      : [
          {
            key: 'outline-undo',
            label: t('outline-undo'),
            hint: navigator.platform.startsWith('Mac') ? '⌘Z' : 'Ctrl+Z',
            disabled: !outline.canUndo,
            run: () => void story.undo(),
          },
        ]),
    { key: 'outline-rename', label: t('outline-rename-title'), run: () => void actions.renameOutline() },
    { key: 'outline-versions', label: t('outline-versions'), run: () => versions.show(outline.file, outline.title ?? outline.file) },
    {
      key: 'plain-text-edit',
      label: t('plain-text-edit'),
      group: 'mode',
      run: () => {
        view.plainTextRequest = true
        view.outlineView = 'text'
      },
    },
  ]
})

async function newOutline(): Promise<void> {
  const title = await ask(t('prompt-outline-title'))
  if (title) await story.create(title)
}

/**
 * Ctrl+Z (⌘Z) undoes the last outline change, unless the keyboard is in a text field or page editor.
 * Escape shows every card again. Ctrl+Shift+E (⌘⇧E) switches between the outline as text and the board or list.
 */
function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && story.about && !document.querySelector('[role="menu"], dialog[open]')) {
    story.about = null
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.key.toLowerCase() === 'e') {
    if (view.workspace !== 'story' || story.showing.kind !== 'outline' || !story.outline || document.querySelector('dialog[open]')) return
    event.preventDefault()
    view.toggleText()
    return
  }
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"], .page-editor')) return
  if (story.showing.kind !== 'outline' || view.outlineView === 'text' || !story.outline?.canUndo) return
  event.preventDefault()
  void story.undo()
}
/** The card or detail the author is on, for the Text view to open on. */
function noteItem(event: FocusEvent): void {
  const key = (event.target as HTMLElement | null)?.closest('[data-item]')?.getAttribute('data-item')
  if (key) story.lastItem = key
}

/**
 * Back from Text: focus the card the cursor was on, once the outline has been read again. A detail
 * folded away in the list is shown; the board has no details of its own, so its card is focused.
 */
watch(
  () => [story.focusItem, story.outline, view.outlineView] as const,
  ([key, , mode]) => {
    if (!key || mode === 'text') return
    const keys = key.split('/').map((_, i, parts) => parts.slice(0, i + 1).join('/'))
    for (const ancestor of keys.slice(1, -1)) story.expand(ancestor)
    const found = keys
      .slice(1)
      .reverse()
      .map((each) => document.querySelector<HTMLElement>(`[data-item="${CSS.escape(each)}"]`))
      .find((element) => element)
    if (!found) return
    found.focus()
    found.scrollIntoView({ block: 'nearest' })
    story.focusItem = null
  },
  { flush: 'post' },
)

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="story" :class="{ 'navigator-hidden': !sidebarShown }" data-testid="story" :style="panels.style.value">
    <nav v-if="sidebarShown" class="navigator" :aria-label="t('workspace-story')">
      <section class="story-group" data-testid="plot">
        <h2 class="group-heading">
          <button type="button" class="group-fold" :aria-expanded="plotOpen" @click="plotOpen = !plotOpen">
            {{ t('story-plot') }}<AppIcon name="chevron" />
          </button>
        </h2>
        <template v-if="plotOpen">
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
        </template>
      </section>

      <section class="story-group" data-testid="world">
        <h2 class="group-heading">
          <button type="button" class="group-fold" :aria-expanded="worldOpen" @click="worldOpen = !worldOpen">
            {{ t('story-world') }}<AppIcon name="chevron" />
          </button>
        </h2>
        <ul v-if="worldOpen">
          <li
            v-for="kind in kinds.kinds.value"
            :key="kind.folder"
            class="row chapter-row"
            :class="{ current: currentKind === kind.folder }"
          >
            <button
              type="button"
              class="chapter"
              :data-gallery="kind.folder"
              :aria-current="story.showing.kind === 'gallery' && story.showing.of === kind.folder ? 'page' : undefined"
              @click="story.showing = { kind: 'gallery', of: kind.folder }"
            >
              <span dir="auto">{{ kinds.labels(kind.folder).many }}</span>
              <span class="count" :aria-label="t('gallery-pages', pagesOf(kind.folder).length)">{{ pagesOf(kind.folder).length }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Pages in folders the book doesn't list as a kind: nothing is lost, and each folder can become a kind (ADR 0011). -->
      <section v-if="kinds.unsorted.value.length > 0" class="story-group" data-testid="unsorted">
        <h2 class="group-heading">{{ t('story-unsorted') }}</h2>
        <ul>
          <li v-for="folder in kinds.unsorted.value" :key="folder" class="row chapter-row" :class="{ current: currentKind === folder }">
            <button
              type="button"
              class="chapter"
              :data-gallery="folder"
              :aria-current="story.showing.kind === 'gallery' && story.showing.of === folder ? 'page' : undefined"
              @click="story.showing = { kind: 'gallery', of: folder }"
            >
              <span dir="auto">{{ folder }}/</span>
              <span class="count" :aria-label="t('gallery-pages', pagesOf(folder).length)">{{ pagesOf(folder).length }}</span>
            </button>
          </li>
        </ul>
      </section>
    </nav>
    <ResizeHandle v-if="sidebarShown" setting="navigatorWidth" grows="end" :label="t('resize-navigator')" />

    <section class="desk" @focusin="noteItem">
      <template v-if="story.showing.kind === 'manuscript'">
        <ItemHeader>
          <h1 class="item-title">{{ t('story-manuscript') }}</h1>
        </ItemHeader>
        <ManuscriptOutline class="story-page" :project="project" />
      </template>
      <WorldGallery v-else-if="story.showing.kind === 'gallery'" :key="story.showing.of" :kind="story.showing.of" />
      <ReferencePage v-else-if="story.showing.kind === 'page'" :key="story.showing.file" :file="story.showing.file" />
      <template v-else-if="story.outline">
        <ItemHeader class="outline-head">
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
              :title="kind === 'text' ? t('view-text-title', textViewKeys()) : undefined"
              :data-testid="`view-${kind}`"
              @click="view.outlineView = kind"
            >
              {{ t(`view-${kind}`) }}
            </button>
          </div>
          <MenuButton :label="t('outline-actions')" :items="outlineItems" button-class="icon-button" align="end" testid="outline-menu" />
          <span v-if="story.about && view.outlineView === 'board'" class="about-chip" role="status" data-testid="showing-about">
            <span dir="auto">{{ t('board-showing-about', story.about.title) }}</span>
            <button
              type="button"
              class="about-clear"
              :aria-label="t('board-show-all')"
              :title="t('board-show-all')"
              @click="story.about = null"
            >
              ✕
            </button>
          </span>
        </ItemHeader>
        <div class="story-page">
          <p v-if="story.outline.invalidDetails" class="warning" role="status">{{ t('invalid-details') }}</p>
          <OutlineText
            v-if="view.outlineView === 'text'"
            :key="story.outline.file"
            :file="story.outline.file"
            :title="story.outline.title ?? story.outline.file"
          />
          <template v-else>
            <KeptAsWritten v-for="(block, i) in story.outline.preamble" :key="`pre-${i}`" :text="block" />
            <div v-if="story.outline.sections.length === 0" class="empty-outline">
              <p>{{ t('outline-empty') }}</p>
            </div>
            <OutlineBoard v-if="view.outlineView === 'board'" :outline="story.outline" />
            <OutlineList v-else :outline="story.outline" />
          </template>
        </div>
      </template>
      <template v-else>
        <ItemHeader />
        <div class="story-page">
          <EmptyState
            sketch="board"
            :title="t('story-empty-title')"
            :text="t('story-empty-text')"
            :action="t('story-new-outline')"
            testid="no-outline"
            @act="newOutline"
          />
        </div>
      </template>
    </section>
  </div>
</template>
