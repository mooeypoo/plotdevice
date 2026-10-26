<script setup lang="ts">
import type { ChapterPosition, ProjectView } from '@plotdevice/contracts'
import type { FormatCommand } from '@plotdevice/editor-codemirror'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChapterWriting } from '../composables/use-chapter-writing'
import { usePrompt } from '../composables/use-prompt'
import { useProjectStore } from '../stores/project'
import { useShelfStore } from '../stores/shelf'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'
import AppIcon from './AppIcon.vue'
import ChapterNavigator from './ChapterNavigator.vue'
import ConflictDialog from './ConflictDialog.vue'
import FormatBubble from './FormatBubble.vue'
import MenuButton from './MenuButton.vue'
import ReferenceShelf from './ReferenceShelf.vue'
import type { MenuItem } from './menu'

const props = defineProps<{ project: ProjectView }>()
const store = useProjectStore()
const settings = useSettingsStore()
const view = useViewStore()
const shelf = useShelfStore()
const { ask } = usePrompt()
const t = settings.t
const host = ref<HTMLElement | null>(null)
const writing = useChapterWriting(host)

async function addLink(): Promise<void> {
  const url = await ask(t('prompt-link'))
  if (url) writing.insertLink(url)
  else writing.focus()
}

const item = (command: FormatCommand, group?: string): MenuItem => ({
  key: `format-${command}`,
  label: t(`format-${command}`),
  icon: command,
  run: () => writing.format(command),
  ...(group ? { group } : {}),
})
const directionItems = (): MenuItem[] => [
  {
    key: 'paragraph-ltr',
    label: t('direction-paragraph-ltr'),
    icon: 'paragraphLtr',
    group: 'paragraph',
    run: () => writing.setParagraphDirection('ltr'),
  },
  { key: 'paragraph-rtl', label: t('direction-paragraph-rtl'), icon: 'paragraphRtl', run: () => writing.setParagraphDirection('rtl') },
  { key: 'paragraph-clear', label: t('direction-paragraph-clear'), icon: 'pilcrow', run: () => writing.setParagraphDirection(null) },
  { key: 'phrase-ltr', label: t('direction-phrase-ltr'), icon: 'phraseLtr', group: 'phrase', run: () => writing.setPhraseDirection('ltr') },
  { key: 'phrase-rtl', label: t('direction-phrase-rtl'), icon: 'phraseRtl', run: () => writing.setPhraseDirection('rtl') },
  { key: 'phrase-clear', label: t('direction-phrase-clear'), icon: 'phraseClear', run: () => writing.setPhraseDirection(null) },
]
/** Everything, under ¶ at the page's edge: reachable without a selection, and by keyboard. */
const formatItems = computed<MenuItem[]>(() => [
  ...(['bold', 'italic', 'heading', 'quote', 'bulletList', 'orderedList', 'sceneBreak'] as const).map((command) => item(command)),
  { key: 'format-link', label: t('format-link'), icon: 'link', run: () => void addLink() },
  ...directionItems(),
])
/** The bubble's ⋯: what its own buttons don't already offer. */
const moreItems = computed<MenuItem[]>(() => [
  item('heading'),
  item('bulletList'),
  item('orderedList'),
  item('sceneBreak'),
  ...directionItems(),
])

const chapterName = computed(() => {
  const file = writing.file.value
  return props.project.chapters.find((chapter) => chapter.file === file)?.title ?? file ?? ''
})
/** Above the page: "Chapter 2" and its title, as the contents show them. */
const heading = computed(() => {
  const file = writing.file.value
  if (!file) return null
  const refs = props.project.contents.flatMap((entry) => (entry.kind === 'part' ? entry.chapters : [entry]))
  const ref = refs.find((chapter) => chapter.file === file)
  const title = props.project.chapters.find((chapter) => chapter.file === file)?.title ?? ref?.linkText ?? ''
  const eyebrow = !ref ? t('navigator-not-in-book') : ref.number !== null ? t('chapter-number', ref.number) : ''
  return { eyebrow, title }
})
const pageClasses = computed(() => [
  `size-${settings.preferences?.writingSize ?? 'medium'}`,
  `width-${settings.preferences?.pageWidth ?? 'medium'}`,
])

/** Where to start: where the author left off, or else the first chapter of the book. The view is recreated for each project. */
function firstChapter(): { file: ProjectPath; position?: ChapterPosition } | null {
  const leftOff = store.opened?.leftOff
  if (leftOff && props.project.chapters.some((chapter) => chapter.file === leftOff.file)) return { file: leftOff.file, position: leftOff }
  for (const entry of props.project.contents) {
    if (entry.kind === 'chapter') return { file: entry.file }
    if (entry.chapters[0]) return { file: entry.chapters[0].file }
  }
  return null
}

function onKey(event: KeyboardEvent): void {
  if (view.workspace !== 'write') return
  if (event.key === 'Escape' && view.focusMode) view.setFocusMode(false)
  else if (event.key.toLowerCase() === 'f' && event.shiftKey && (event.ctrlKey || event.metaKey)) view.setFocusMode(!view.focusMode)
  else if (event.key.toLowerCase() === 'r' && event.shiftKey && (event.ctrlKey || event.metaKey)) shelf.visible = !shelf.visible
  else return
  event.preventDefault()
}

// Entering or leaving focus mode returns the author to the page, cursor where it was.
watch(
  () => view.focusMode,
  () => void nextTick(() => writing.focus()),
)

// The top bar shows the save status, and the book menu offers this chapter's versions.
watch(
  () => writing.status.value,
  (status) => {
    view.saveStatus = status
  },
  { immediate: true },
)
watch(
  () => [writing.file.value, chapterName.value] as const,
  ([file, name]) => {
    view.writingChapter = file ? { file, name } : null
  },
  { immediate: true },
)

// A chapter chosen in the Story workspace's manuscript outline.
watch(
  () => view.chapterRequest,
  (file) => {
    if (!file) return
    view.chapterRequest = null
    void writing.open(file)
  },
)

// Back in Write, the cursor is where it was. Leaving it, the page's position is noted while it can be measured.
watch(
  () => view.workspace,
  (workspace) => {
    if (workspace === 'write') void nextTick(() => writing.focus())
    else writing.hiding()
  },
)

onMounted(() => {
  void shelf.reset() // this view is recreated for each project
  window.addEventListener('keydown', onKey)
  const start = firstChapter()
  if (start) void writing.open(start.file, start.position)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  view.writingChapter = null
  view.saveStatus = null
})
</script>

<template>
  <div
    class="writing"
    :class="{ 'focus-mode': view.focusMode, 'navigator-hidden': view.navigatorHidden, 'with-shelf': shelf.visible && !view.focusMode }"
  >
    <ChapterNavigator
      v-if="!view.focusMode && !view.navigatorHidden"
      :project="project"
      :open-file="writing.file.value"
      @open="writing.open"
    />

    <section class="desk">
      <div v-if="!view.focusMode" class="edge">
        <button
          type="button"
          class="icon-button"
          data-testid="toggle-navigator"
          :aria-pressed="!view.navigatorHidden"
          :aria-label="t('navigator-label')"
          :title="t('navigator-label')"
          @click="view.navigatorHidden = !view.navigatorHidden"
        >
          <AppIcon name="chapters" />
        </button>
        <span class="grow"></span>
        <MenuButton :label="t('toolbar-format')" :items="formatItems" button-class="icon-button" align="end" testid="format-menu">
          <AppIcon name="pilcrow" />
        </MenuButton>
        <button
          type="button"
          class="icon-button"
          data-testid="toggle-shelf"
          :aria-pressed="shelf.visible"
          :aria-label="t('shelf')"
          :title="t('shelf')"
          @click="shelf.visible = !shelf.visible"
        >
          <AppIcon name="references" />
        </button>
      </div>
      <button v-else type="button" class="leave-focus" data-testid="leave-focus" @click="view.setFocusMode(false)">
        {{ t('focus-exit') }}
      </button>

      <div class="paper" :class="pageClasses" @scroll.passive="writing.refreshSelection">
        <p v-if="writing.state.value === 'unreadable'" class="warning" role="alert">{{ t('chapter-unreadable') }}</p>
        <p v-else-if="writing.state.value === 'missing'" class="warning" role="alert">{{ t('chapter-missing') }}</p>
        <article v-show="writing.state.value === 'ready' || writing.state.value === 'loading'" class="sheet">
          <header v-if="heading" class="chapter-head" :lang="project.language">
            <p v-if="heading.eyebrow" class="chapter-eyebrow">{{ heading.eyebrow }}</p>
            <h1 class="chapter-title" dir="auto">{{ heading.title }}</h1>
          </header>
          <div ref="host" class="editor-host" :lang="project.language" data-testid="editor"></div>
        </article>
        <FormatBubble :place="writing.selection.value" :more="moreItems" @format="writing.format" @link="addLink" @back="writing.focus" />
      </div>
    </section>

    <ReferenceShelf v-if="shelf.visible && !view.focusMode" :chapter="writing.file.value" />

    <ConflictDialog
      v-if="writing.status.value === 'conflict'"
      :chapter-name="chapterName"
      :busy="writing.resolving.value"
      @choose="writing.resolveConflict"
    />
  </div>
</template>
