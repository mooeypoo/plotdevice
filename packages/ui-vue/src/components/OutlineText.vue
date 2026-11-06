<script setup lang="ts">
import { itemAt, itemStart, keptPassages, readOutline, type ParsedOutline, type TextRange } from '@plotdevice/markdown'
import { keyOf } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChapterWriting } from '../composables/use-chapter-writing'
import { useLinkActions } from '../composables/use-link-actions'
import { useLinkSuggestions } from '../composables/use-link-suggestions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { textViewKeys, useViewStore } from '../stores/view'
import ConflictDialog from './ConflictDialog.vue'
import FormatBubble from './FormatBubble.vue'
import FormatButton from './FormatButton.vue'
import { formatItem, HEADING_COMMANDS, headingKeys, isPlainTextKey, plainTextItem } from './format-items'
import LinkBubble from './LinkBubble.vue'
import type { MenuItem } from './menu'
import PlainTextBanner from './PlainTextBanner.vue'
import LinkSuggestions from './LinkSuggestions.vue'

// The outline's Markdown, typed freely (Milestone 14). It is the same editor, autosave and conflict
// protection as a chapter's; the board and list read the file again when they show. It opens on the
// card last focused there, and leaving it focuses the card the cursor is on.
const props = defineProps<{ file: ProjectPath; title: string }>()
const story = useStoryStore()
const view = useViewStore()
const linkActions = useLinkActions()
const t = useSettingsStore().t
const host = ref<HTMLElement | null>(null)
const kept = ref<TextRange[]>([])

/**
 * The text as the editor counts it, for reading the outline: a line break is one position, even in a
 * file written with `\r\n`.
 */
const parsed = (): ParsedOutline => readOutline(page.text().replace(/\r\n/g, '\n'))

// Before the editor's own, which closes it: what the cursor is on, while there is still an editor to ask.
onBeforeUnmount(() => {
  if (page.state.value !== 'ready') return
  const at = itemAt(parsed(), page.cursor())
  const key = at ? keyOf({ section: at.section, path: [...at.path] }) : null
  // The text goes to the host before the outline is read again, and the host finishes writing it first.
  page.flush()
  void story.reload().then(() => (story.focusItem = key))
})

const links = useLinkSuggestions((markdown) => page.pickLink(markdown))
const page = useChapterWriting(host, {
  remembersPosition: false,
  label: () => t('outline-text'),
  outline: {
    nestingUnit: (text) => readOutline(text).nestingUnit ?? '  ',
    onLinkQuery: (found) => (links.query.value = found),
    onListKey: links.onListKey,
  },
})

/** The bubble's ⋯: heading levels (Heading 2 is a section) and a bulleted list. */
/** Text size and page width from Aa, as on a chapter (Milestone 17). */
const settings = useSettingsStore()
const pageClasses = computed(() => [
  `size-${settings.preferences?.writingSize ?? 'medium'}`,
  `width-${settings.preferences?.pageWidth ?? 'medium'}`,
])
// The save status shows in the top bar, in the same place as a chapter's (Milestone 17, decision 3).
watch(
  () => page.status.value,
  (status) => (view.storySaveStatus = status),
  { immediate: true },
)
onBeforeUnmount(() => (view.storySaveStatus = null))

/** Format, at the page's corner: sections (Heading 2), lists, link and plain text. */
const formatItems = computed<MenuItem[]>(() => [
  ...HEADING_COMMANDS.map((command) => formatItem(t, command, () => page.format(command))),
  formatItem(t, 'bulletList', () => page.format('bulletList'), 'lists'),
  { key: 'format-link', label: t('format-link'), icon: 'link', run: () => void addLink() },
  plainTextItem(t, page.mode.value, page.setMode),
])

/** The switch beside Format, and Ctrl+Shift+M in the editor: plain text and back, the cursor kept. */
function togglePlain(): void {
  page.setMode(page.mode.value === 'plain' ? 'rendered' : 'plain')
  page.focus()
}
function onEditorKey(event: KeyboardEvent): void {
  if (!isPlainTextKey(event)) return
  event.preventDefault()
  togglePlain()
}

const moreItems = computed<MenuItem[]>(() => [
  ...HEADING_COMMANDS.map((command) => formatItem(t, command, () => page.format(command))),
  formatItem(t, 'bulletList', () => page.format('bulletList'), 'lists'),
])

/** The bubble's link button: a page or chapter, from the picker. */
async function addLink(): Promise<void> {
  const target = await linkActions.choose(props.file, '')
  if (target) page.insertLink(target)
  else page.focus()
}

/** "Edit as plain text" from the outline's menu, now or when Text opens. */
function takePlainTextRequest(): void {
  if (!view.plainTextRequest || page.state.value !== 'ready') return
  view.plainTextRequest = false
  page.setMode('plain')
}
watch(() => view.plainTextRequest, takePlainTextRequest)

const countKept = (): void => {
  if (page.state.value === 'ready') kept.value = keptPassages(parsed())
}

/** Selects the next passage the board will show "kept as written", after the cursor, from the top again after the last. */
function showKept(): void {
  const cursor = page.cursor()
  const next = kept.value.find((range) => range.start > cursor) ?? kept.value[0]
  if (next) page.select(next.start, next.end)
}

async function resolve(choice: 'keep-both' | 'use-mine'): Promise<void> {
  await page.resolveConflict(choice)
  // "Keep both" puts the author's text in a new outline beside this one.
  if (choice === 'keep-both') await story.refresh()
}

onMounted(async () => {
  await page.open(props.file)
  if (page.state.value !== 'ready') return
  const key = story.lastItem
  if (key) {
    const [section = 0, ...path] = key.split('/').map(Number)
    const start = itemStart(parsed(), { section, path })
    if (start !== null) page.select(start)
  }
  countKept()
  takePlainTextRequest()
})
// Counted again as each save is sent, not on every key.
watch(page.status, countKept)
</script>

<template>
  <div class="outline-text" data-testid="outline-text">
    <p class="secondary hint">{{ t('outline-text-hint', textViewKeys(), headingKeys(2)) }}</p>
    <PlainTextBanner v-if="page.mode.value === 'plain'" @back="page.setMode('rendered')" />
    <p v-if="page.state.value === 'unreadable'" class="warning" role="alert">{{ t('chapter-unreadable') }}</p>
    <p v-else-if="page.state.value === 'missing'" class="warning" role="alert">{{ t('chapter-missing') }}</p>
    <div class="paper" :class="pageClasses">
      <FormatButton :items="formatItems" :plain="page.mode.value === 'plain'" @plain="togglePlain" />
      <div
        v-show="page.state.value === 'ready' || page.state.value === 'loading'"
        ref="host"
        @keydown="onEditorKey"
        class="editor-host outline-text-editor"
        data-testid="outline-text-editor"
      ></div>
    </div>
    <p class="status-line">
      <span v-if="kept.length > 0" class="kept-count" data-testid="outline-text-kept">
        {{ t('outline-text-kept', kept.length) }}
        <button type="button" class="link-button" data-testid="outline-text-show-kept" @click="showKept">
          {{ t('outline-text-show-kept') }}
        </button>
      </span>
    </p>
    <FormatBubble :place="page.selection.value" :more="moreItems" @format="page.format" @link="addLink" @back="page.focus" />
    <LinkBubble
      :link="page.link.value"
      :from="file"
      :hidden="page.selection.value !== null"
      @change="page.changeLink"
      @remove="page.removeLink"
      @back="page.focus"
    />
    <LinkSuggestions
      v-if="links.open.value && links.query.value"
      :query="links.query.value"
      :offered="links.offered.value"
      :selected="links.selected.value"
      @choose="links.choose"
    />
    <ConflictDialog v-if="page.status.value === 'conflict'" :chapter-name="title" :busy="page.resolving.value" @choose="resolve" />
  </div>
</template>
