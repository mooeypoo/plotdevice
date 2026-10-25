<script setup lang="ts">
import type { ProjectView } from '@plotdevice/contracts'
import type { FormatCommand } from '@plotdevice/editor-codemirror'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChapterWriting } from '../composables/use-chapter-writing'
import { usePrompt } from '../composables/use-prompt'
import { useProjectStore } from '../stores/project'
import { useShelfStore } from '../stores/shelf'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'
import ChapterNavigator from './ChapterNavigator.vue'
import ConflictDialog from './ConflictDialog.vue'
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

const formats: FormatCommand[] = ['bold', 'italic', 'heading', 'quote', 'bulletList', 'orderedList', 'sceneBreak']
const formatItems = computed<MenuItem[]>(() => [
  ...formats.map((command) => ({ key: `format-${command}`, label: t(`format-${command}`), run: () => writing.format(command) })),
  {
    key: 'format-link',
    label: t('format-link'),
    run: async () => {
      const url = await ask(t('prompt-link'))
      if (url) writing.insertLink(url)
      else writing.focus()
    },
  },
])
const directionItems = computed<MenuItem[]>(() => [
  { key: 'paragraph-ltr', label: t('direction-paragraph-ltr'), run: () => writing.setParagraphDirection('ltr') },
  { key: 'paragraph-rtl', label: t('direction-paragraph-rtl'), run: () => writing.setParagraphDirection('rtl') },
  { key: 'paragraph-clear', label: t('direction-paragraph-clear'), run: () => writing.setParagraphDirection(null) },
  { key: 'phrase-ltr', label: t('direction-phrase-ltr'), group: 'phrase', run: () => writing.setPhraseDirection('ltr') },
  { key: 'phrase-rtl', label: t('direction-phrase-rtl'), run: () => writing.setPhraseDirection('rtl') },
  { key: 'phrase-clear', label: t('direction-phrase-clear'), run: () => writing.setPhraseDirection(null) },
])

const chapterName = computed(() => {
  const file = writing.file.value
  return props.project.chapters.find((chapter) => chapter.file === file)?.title ?? file ?? ''
})
const pageClasses = computed(() => [`size-${settings.preferences?.writingSize ?? 'medium'}`, `width-${settings.preferences?.pageWidth ?? 'medium'}`])

/** Where to start: where the author left off, or else the first chapter of the book. The view is recreated for each project. */
function firstChapter(): { file: ProjectPath; cursor: number } | null {
  const leftOff = store.opened?.leftOff
  if (leftOff && props.project.chapters.some((chapter) => chapter.file === leftOff.file)) return leftOff
  for (const entry of props.project.contents) {
    if (entry.kind === 'chapter') return { file: entry.file, cursor: 0 }
    if (entry.chapters[0]) return { file: entry.chapters[0].file, cursor: 0 }
  }
  return null
}

/** Entering or leaving focus mode returns the author to the page, cursor where it was. */
function setFocusMode(on: boolean): void {
  view.focusMode = on
  void nextTick(() => writing.focus())
}

function onKey(event: KeyboardEvent): void {
  if (view.workspace !== 'write') return
  if (event.key === 'Escape' && view.focusMode) setFocusMode(false)
  else if (event.key.toLowerCase() === 'f' && event.shiftKey && (event.ctrlKey || event.metaKey)) setFocusMode(!view.focusMode)
  else if (event.key.toLowerCase() === 'r' && event.shiftKey && (event.ctrlKey || event.metaKey)) shelf.visible = !shelf.visible
  else return
  event.preventDefault()
}

// A chapter chosen in the Story workspace's manuscript outline.
watch(
  () => view.chapterRequest,
  (file) => {
    if (!file) return
    view.chapterRequest = null
    void writing.open(file)
  },
)

// Back in Write, the cursor is where it was.
watch(
  () => view.workspace,
  (workspace) => {
    if (workspace === 'write') void nextTick(() => writing.focus())
  },
)

onMounted(() => {
  void shelf.reset() // this view is recreated for each project
  window.addEventListener('keydown', onKey)
  const start = firstChapter()
  if (start) void writing.open(start.file, start.cursor)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="writing" :class="{ 'focus-mode': view.focusMode, 'navigator-hidden': view.navigatorHidden, 'with-shelf': shelf.visible && !view.focusMode }">
    <ChapterNavigator v-if="!view.focusMode && !view.navigatorHidden" :project="project" :open-file="writing.file.value" @open="writing.open" />

    <section class="desk">
      <div v-if="!view.focusMode" class="toolbar" role="toolbar" :aria-label="t('toolbar-format')">
        <button type="button" data-testid="toggle-navigator" @click="view.navigatorHidden = !view.navigatorHidden">
          {{ view.navigatorHidden ? t('navigator-show') : t('navigator-hide') }}
        </button>
        <MenuButton :label="t('toolbar-format')" :text="t('toolbar-format')" :items="formatItems" testid="format-menu" />
        <MenuButton :label="t('toolbar-direction')" :text="t('toolbar-direction')" :items="directionItems" testid="direction-menu" />
        <button type="button" data-testid="focus-mode" @click="setFocusMode(true)">{{ t('focus-enter') }}</button>
        <button type="button" class="toolbar-end" data-testid="toggle-shelf" :aria-pressed="shelf.visible" @click="shelf.visible = !shelf.visible">
          {{ shelf.visible ? t('shelf-hide') : t('shelf-show') }}
        </button>
      </div>
      <button v-else type="button" class="leave-focus" data-testid="leave-focus" @click="setFocusMode(false)">{{ t('focus-exit') }}</button>

      <div class="paper" :class="pageClasses">
        <p v-if="writing.state.value === 'unreadable'" class="warning" role="alert">{{ t('chapter-unreadable') }}</p>
        <p v-else-if="writing.state.value === 'missing'" class="warning" role="alert">{{ t('chapter-missing') }}</p>
        <div v-show="writing.state.value === 'ready' || writing.state.value === 'loading'" ref="host" class="editor-host" :lang="project.language" data-testid="editor"></div>
      </div>

      <footer v-if="!view.focusMode" class="status-line">
        <span role="status" data-testid="save-status">{{ writing.status.value ? t(`save-${writing.status.value}`) : '' }}</span>
        <span v-if="store.notice" class="notice" role="alert">
          {{ t(store.notice.key, ...store.notice.params) }}
          <button type="button" class="link-button" :aria-label="t('prompt-cancel')" @click="store.notice = null">×</button>
        </span>
      </footer>
    </section>

    <ReferenceShelf v-if="shelf.visible && !view.focusMode" :chapter="writing.file.value" />

    <ConflictDialog v-if="writing.status.value === 'conflict'" :chapter-name="chapterName" :busy="writing.resolving.value" @choose="writing.resolveConflict" />
  </div>
</template>
