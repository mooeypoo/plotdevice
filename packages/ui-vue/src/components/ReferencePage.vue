<script setup lang="ts">
import { RELATIONSHIP_HEADINGS, type ProjectPath } from '@plotdevice/shared'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChapterWriting } from '../composables/use-chapter-writing'
import { useKinds } from '../composables/use-kinds'
import { useLinkActions } from '../composables/use-link-actions'
import { useLinkSuggestions } from '../composables/use-link-suggestions'
import { usePrompt } from '../composables/use-prompt'
import { useVersions } from '../composables/use-versions'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import ConflictDialog from './ConflictDialog.vue'
import FormatBubble from './FormatBubble.vue'
import FormatButton from './FormatButton.vue'
import ItemHeader from './ItemHeader.vue'
import { formatItem, HEADING_COMMANDS } from './format-items'
import LinkBubble from './LinkBubble.vue'
import LinkSuggestions from './LinkSuggestions.vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'
import PageConnections from './PageConnections.vue'
import PlainTextBanner from './PlainTextBanner.vue'
import TagPills from './TagPills.vue'

// One character, place or note: its name, and its text in the same editor as chapters, with the same
// autosave and conflict protection. Write's place in the book is left alone.
const props = defineProps<{ file: ProjectPath }>()
const story = useStoryStore()
const settings = useSettingsStore()
const { ask } = usePrompt()
const versions = useVersions()
const t = settings.t
const host = ref<HTMLElement | null>(null)
const linkActions = useLinkActions()
const kinds = useKinds()
// `@` or `[[` offers pages and chapters to link, as in an outline (Milestone 16).
const links = useLinkSuggestions(
  (markdown) => page.pickLink(markdown),
  () => props.file,
)
// The relationships section is listed beside the page, so in the text it folds into one line.
const page = useChapterWriting(host, {
  remembersPosition: false,
  foldedSection: { headings: Object.values(RELATIONSHIP_HEADINGS), label: () => t('relationships-folded') },
  links: { onLinkQuery: (found) => (links.query.value = found), onListKey: links.onListKey },
})

const view = useViewStore()
/** Text size and page width from Aa, as on a chapter (Milestone 17). */
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

/** Format, at the page's corner: heading levels, lists and quote, and plain text. */
const formatItems = computed<MenuItem[]>(() => [
  ...HEADING_COMMANDS.map((command) => formatItem(t, command, () => page.format(command))),
  formatItem(t, 'quote', () => page.format('quote'), 'blocks'),
  formatItem(t, 'bulletList', () => page.format('bulletList')),
  formatItem(t, 'orderedList', () => page.format('orderedList')),
  { key: 'format-link', label: t('format-link'), icon: 'link', run: () => void addLink() },
  page.mode.value === 'plain'
    ? { key: 'plain-text-back', label: t('plain-text-back'), group: 'mode', run: () => page.setMode('rendered') }
    : { key: 'plain-text-edit', label: t('plain-text-edit'), group: 'mode', run: () => page.setMode('plain') },
])

/** The bubble's ⋯: heading levels and a bulleted list. */
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
const summary = computed(() => story.references.find((reference) => reference.file === props.file) ?? null)

async function renameFile(): Promise<void> {
  const current = props.file.split('/').at(-1)?.replace(/\.md$/, '') ?? ''
  const name = await ask(t('prompt-file-name-page'), current)
  if (name && name !== current) await story.renameReferenceFile(props.file, name)
}

async function rename(): Promise<void> {
  const title = await ask(t('prompt-reference-title'), summary.value?.title ?? '')
  if (title) await story.renameReference(props.file, title)
}

const pageItems = computed<MenuItem[]>(() => [
  { key: 'rename-reference', label: t('reference-rename'), run: () => void rename() },
  { key: 'rename-page-file', label: t('reference-rename-file'), run: () => void renameFile() },
  { key: 'page-versions', label: t('versions'), run: () => versions.show(props.file, summary.value?.title ?? props.file) },
])

onMounted(() => void page.open(props.file))
watch(
  () => props.file,
  (file) => void page.open(file),
)
</script>

<template>
  <article class="reference-page" data-testid="reference-page">
    <ItemHeader>
      <button
        v-if="summary"
        type="button"
        class="crumb"
        data-testid="back-to-gallery"
        :aria-label="t('story-back-to', kinds.labels(summary.kind).many)"
        @click="story.showing = { kind: 'gallery', of: summary.kind }"
      >
        {{ kinds.labels(summary.kind).many }}
      </button>
      <h1 class="item-title" dir="auto">{{ summary?.title ?? file }}</h1>
      <MenuButton :label="t('page-actions')" :items="pageItems" button-class="icon-button" testid="page-menu" />
    </ItemHeader>
    <div class="story-page reference-body">
      <p v-if="summary && summary.aka.length > 0" class="secondary" dir="auto">{{ t('reference-aka', summary.aka.join(', ')) }}</p>
      <TagPills v-if="summary && !summary.invalidDetails" :tags="summary.tags" @change="(tags) => story.setTags(file, tags)" />
      <div class="page-layout">
        <div class="page-main">
          <p class="secondary hint">{{ t('reference-hint') }}</p>
          <p v-if="page.state.value === 'unreadable'" class="warning" role="alert">{{ t('chapter-unreadable') }}</p>
          <p v-else-if="page.state.value === 'missing'" class="warning" role="alert">{{ t('chapter-missing') }}</p>
          <PlainTextBanner v-if="page.mode.value === 'plain'" @back="page.setMode('rendered')" />
          <div class="paper" :class="pageClasses">
            <FormatButton :items="formatItems" />
            <div
              v-show="page.state.value === 'ready' || page.state.value === 'loading'"
              ref="host"
              class="editor-host page-editor"
              data-testid="page-editor"
            ></div>
          </div>
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
        </div>
        <PageConnections v-if="summary" :page="summary" />
      </div>
    </div>
    <ConflictDialog
      v-if="page.status.value === 'conflict'"
      :chapter-name="summary?.title ?? file"
      :busy="page.resolving.value"
      @choose="page.resolveConflict"
    />
  </article>
</template>
