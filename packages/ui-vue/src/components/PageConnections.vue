<script setup lang="ts">
import type { LinkedFromView, ReferenceSummaryView } from '@plotdevice/contracts'
import { linkTextOnly, markdownLink, relationshipWords } from '@plotdevice/presentation'
import { dirnameOf, type ProjectPath } from '@plotdevice/shared'
import { computed, ref, watch } from 'vue'
import { useApi } from '../api'
import { useConfirm } from '../composables/use-confirm'
import { useFollowLink } from '../composables/use-follow-link'
import { useLinkPicker } from '../composables/use-link-picker'
import { usePrompt } from '../composables/use-prompt'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import InlineText from './InlineText.vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'

// Beside a page: its relationships (ADR 0009), what links to it, and a way to start its arc.
const props = defineProps<{ page: ReferenceSummaryView }>()
const api = useApi()
const story = useStoryStore()
const view = useViewStore()
const settings = useSettingsStore()
const { ask } = usePrompt()
const { confirm } = useConfirm()
const { pick } = useLinkPicker()
const follow = useFollowLink()
const t = settings.t
const linked = ref<LinkedFromView | null>(null)

// Again whenever any page changes: a relationship added elsewhere may point here.
watch(
  () => [props.page.file, story.references, story.outlines] as const,
  async ([file]) => {
    const found = await api.linkedFrom(file)
    if (file === props.page.file) linked.value = found
  },
  { immediate: true },
)

/** The cards that link here, by outline. */
const outlines = computed(() => {
  const groups = new Map<ProjectPath, { file: ProjectPath; title: string; cards: { section: string | null; card: string }[] }>()
  for (const card of linked.value?.cards ?? []) {
    const group = groups.get(card.outline) ?? { file: card.outline, title: card.outlineTitle ?? card.outline, cards: [] }
    group.cards.push({ section: card.section, card: card.card })
    groups.set(card.outline, group)
  }
  return [...groups.values()]
})
const nothingLinks = computed(
  () => linked.value !== null && linked.value.cards.length + linked.value.pages.length + linked.value.chapters.length === 0,
)

async function addRelationship(): Promise<void> {
  const target = await pick()
  if (!target || target.file === props.page.file) return
  const words = await ask(t('prompt-relationship-words', props.page.title, target.title))
  if (!words?.trim()) return
  const text = `${words.trim()} ${markdownLink(dirnameOf(props.page.file), target.file, target.title)}`
  await story.editRelationship(props.page.file, { kind: 'add', text })
}

function relationshipMenu(index: number, text: string): MenuItem[] {
  const parts = relationshipWords(text)
  const reword: MenuItem[] = parts
    ? [
        {
          key: 'reword',
          label: t('relationship-reword'),
          run: async () => {
            const words = await ask(t('prompt-relationship-reword'), parts.words)
            if (words?.trim())
              await story.editRelationship(props.page.file, { kind: 'change', index, text: `${words.trim()} ${parts.link}` })
          },
        },
      ]
    : []
  return [
    ...reword,
    {
      key: 'remove',
      label: t('relationship-remove'),
      group: 'delete',
      run: async () => {
        if (await confirm(t('confirm-remove-relationship', linkTextOnly(text)), t('relationship-remove')))
          await story.editRelationship(props.page.file, { kind: 'remove', index })
      },
    },
  ]
}

function showOnBoard(outline: ProjectPath): void {
  view.outlineView = 'board'
  void story.showOnBoard(outline, props.page)
}

async function startArc(): Promise<void> {
  const title = await ask(t('prompt-outline-title'), t('arc-outline-title', props.page.title))
  if (title) await story.create(title, props.page.file)
}
</script>

<template>
  <aside class="connections" :aria-label="t('connections')">
    <section class="connection-box" data-testid="relationships">
      <h2>{{ t('relationships') }}</h2>
      <ul v-if="page.relationships.length > 0">
        <li v-for="(relationship, index) in page.relationships" :key="`${index}-${relationship.text}`" class="row">
          <InlineText :text="relationship.text" follow-links @follow="follow(dirnameOf(page.file), $event)" />
          <MenuButton
            :label="t('relationship-actions', linkTextOnly(relationship.text))"
            :items="relationshipMenu(index, relationship.text)"
          />
        </li>
      </ul>
      <button type="button" class="add-link" data-testid="add-relationship" @click="addRelationship">{{ t('relationship-add') }}</button>
    </section>

    <section class="connection-box" data-testid="linked-from">
      <h2>{{ t('linked-from') }}</h2>
      <p v-if="nothingLinks" class="secondary">{{ t('linked-from-none') }}</p>
      <div v-for="outline in outlines" :key="outline.file" class="linked-group">
        <h3 dir="auto">{{ outline.title }}</h3>
        <button
          v-for="(card, index) in outline.cards"
          :key="index"
          type="button"
          class="linked-entry"
          :data-outline-card="outline.file"
          @click="story.open(outline.file)"
        >
          <small v-if="card.section" dir="auto">{{ card.section }}</small>
          <span dir="auto">{{ linkTextOnly(card.card) }}</span>
        </button>
        <button type="button" class="show-on-board" data-testid="show-on-board" @click="showOnBoard(outline.file)">
          {{ t('show-on-board') }}
        </button>
      </div>
      <div v-if="linked && linked.pages.length > 0" class="linked-group">
        <h3>{{ t('linked-from-pages') }}</h3>
        <button
          v-for="other in linked.pages"
          :key="other.file"
          type="button"
          class="linked-entry"
          :data-linked-page="other.file"
          @click="story.showing = { kind: 'page', file: other.file }"
        >
          <small v-for="(relationship, index) in other.relationships" :key="index" dir="auto">{{ linkTextOnly(relationship) }}</small>
          <span dir="auto">{{ other.title }}</span>
        </button>
      </div>
      <div v-if="linked && linked.chapters.length > 0" class="linked-group">
        <h3>{{ t('linked-from-chapters') }}</h3>
        <button
          v-for="chapter in linked.chapters"
          :key="chapter.file"
          type="button"
          class="linked-entry"
          :data-linked-chapter="chapter.file"
          @click="view.writeChapter(chapter.file)"
        >
          <span dir="auto">{{ chapter.title }}</span>
        </button>
      </div>
    </section>

    <button type="button" class="start-arc" data-testid="start-arc" @click="startArc">
      <span>{{ t('arc-start') }}</span>
      <small>{{ t('arc-start-hint', page.title) }}</small>
    </button>
  </aside>
</template>
