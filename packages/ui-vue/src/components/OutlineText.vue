<script setup lang="ts">
import { itemAt, itemStart, keptPassages, readOutline, type ParsedOutline, type TextRange } from '@plotdevice/markdown'
import { keyOf } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChapterWriting } from '../composables/use-chapter-writing'
import { useLinkSuggestions } from '../composables/use-link-suggestions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { textViewKeys } from '../stores/view'
import ConflictDialog from './ConflictDialog.vue'
import LinkSuggestions from './LinkSuggestions.vue'

// The outline's Markdown, typed freely (Milestone 14). It is the same editor, autosave and conflict
// protection as a chapter's; the board and list read the file again when they show. It opens on the
// card last focused there, and leaving it focuses the card the cursor is on.
const props = defineProps<{ file: ProjectPath; title: string }>()
const story = useStoryStore()
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
})
// Counted again as each save is sent, not on every key.
watch(page.status, countKept)
</script>

<template>
  <div class="outline-text" data-testid="outline-text">
    <p class="secondary hint">{{ t('outline-text-hint', textViewKeys()) }}</p>
    <p v-if="page.state.value === 'unreadable'" class="warning" role="alert">{{ t('chapter-unreadable') }}</p>
    <p v-else-if="page.state.value === 'missing'" class="warning" role="alert">{{ t('chapter-missing') }}</p>
    <div class="paper size-medium width-medium">
      <div
        v-show="page.state.value === 'ready' || page.state.value === 'loading'"
        ref="host"
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
      <span role="status" data-testid="outline-text-save-status">{{ page.status.value ? t(`save-${page.status.value}`) : '' }}</span>
    </p>
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
