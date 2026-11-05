<script setup lang="ts">
import type { ReferenceKind, ReferenceSummaryView } from '@plotdevice/contracts'
import { galleryPages, groupByTags, linkTextOnly, tagRow } from '@plotdevice/presentation'
import { computed, ref } from 'vue'
import { usePrompt } from '../composables/use-prompt'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import EmptyState from './EmptyState.vue'
import ItemHeader from './ItemHeader.vue'
import TagFilter from './TagFilter.vue'

// One kind of page (characters, places or notes) as cards, A to Z, with a card to add one more.
// Choosing tags above it groups the cards by them; the rest fold away under "All characters" (places, notes).
const props = defineProps<{ kind: ReferenceKind }>()
const story = useStoryStore()
const settings = useSettingsStore()
const { ask } = usePrompt()
const t = settings.t
const pages = computed(() => galleryPages(story.references, props.kind, settings.locale))
const tags = computed(() => tagRow(pages.value, settings.locale))
/** A long list (more than 12 pages) shows compact cards: the name and one line (Milestone 17). */
const compact = computed(() => pages.value.length > 12)
const chosen = computed({
  get: () => story.galleryTags[props.kind] ?? [],
  set: (value: string[]) => (story.galleryTags = { ...story.galleryTags, [props.kind]: value }),
})
const othersOpen = ref(false)
/** Tags shown on a card before "+ N more", so a long list never crowds it. */
const CARD_TAGS = 4

interface Section {
  key: string
  label: string | null
  pages: ReferenceSummaryView[]
  folds?: boolean
}
const sections = computed<Section[]>(() => {
  const { groups, others } = groupByTags(pages.value, chosen.value)
  if (groups.length === 0) return [{ key: 'all', label: null, pages: pages.value }]
  return [
    ...groups.map((group) => ({ key: `tag:${group.tag}`, label: group.tag, pages: group.pages })),
    ...(others.length > 0 ? [{ key: 'others', label: t(`tag-all-${props.kind}`, String(others.length)), pages: others, folds: true }] : []),
  ]
})

async function newPage(): Promise<void> {
  const title = await ask(t('prompt-reference-title'))
  if (title) await story.createReference(props.kind, title)
}
</script>

<template>
  <div class="world-gallery">
    <ItemHeader>
      <h1 class="item-title">{{ t(`story-${kind}`) }}</h1>
    </ItemHeader>
    <div v-if="pages.length === 0" class="story-page">
      <EmptyState
        sketch="cards"
        :title="t(`gallery-empty-${kind}`)"
        :text="t(`gallery-empty-${kind}-text`)"
        :action="t(`new-${kind}`)"
        :testid="`no-${kind}`"
        :action-testid="`new-${kind}`"
        @act="newPage"
      />
    </div>
    <div v-else class="story-page">
      <TagFilter v-model:chosen="chosen" :tags="tags" manage />
      <section v-for="section in sections" :key="section.key" class="gallery-group" :data-group="section.key">
        <h2 v-if="section.label && !section.folds" class="group-label" dir="auto">{{ section.label }}</h2>
        <button
          v-else-if="section.folds"
          type="button"
          class="group-label group-toggle"
          :aria-expanded="othersOpen"
          data-testid="the-rest"
          @click="othersOpen = !othersOpen"
        >
          {{ section.label }}
        </button>
        <ul
          v-if="!section.folds || othersOpen"
          class="gallery"
          :class="{ compact }"
          :aria-label="section.label ?? t(`story-${kind}`)"
          :data-testid="section.key === 'all' ? `gallery-${kind}` : undefined"
        >
          <li v-for="page in section.pages" :key="page.file">
            <button type="button" class="page-card" :data-page="page.file" @click="story.showing = { kind: 'page', file: page.file }">
              <span class="page-card-title" dir="auto">{{ page.title }}</span>
              <span v-if="page.aka.length > 0" class="page-card-aka" dir="auto">{{ t('reference-aka', page.aka.join(', ')) }}</span>
              <span v-if="page.description" class="page-card-description" dir="auto">{{ page.description }}</span>
              <span v-if="page.tags.length > 0" class="page-card-tags" :aria-label="t('tags')" data-testid="card-tags">
                <span v-for="tag in page.tags.slice(0, CARD_TAGS)" :key="tag" class="tag-pill" dir="auto">{{ tag }}</span>
                <span v-if="page.tags.length > CARD_TAGS" class="tag-pill tag-pill-more">{{
                  t('tag-more', String(page.tags.length - CARD_TAGS))
                }}</span>
              </span>
              <span v-if="page.relationships.length > 0" class="page-card-relationships">
                <span v-for="(relationship, index) in page.relationships.slice(0, 3)" :key="index" dir="auto">
                  {{ linkTextOnly(relationship.text) }}
                </span>
              </span>
            </button>
          </li>
          <li v-if="section.key === 'all'">
            <button type="button" class="page-card new-page" :data-testid="`new-${kind}`" @click="newPage">{{ t(`new-${kind}`) }}</button>
          </li>
        </ul>
      </section>
      <ul v-if="sections[0]?.key !== 'all'" class="gallery">
        <li>
          <button type="button" class="page-card new-page" :data-testid="`new-${kind}`" @click="newPage">{{ t(`new-${kind}`) }}</button>
        </li>
      </ul>
    </div>
  </div>
</template>
