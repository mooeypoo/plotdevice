<script setup lang="ts">
import type { ReferenceKind } from '@plotdevice/contracts'
import { galleryPages } from '@plotdevice/presentation'
import { computed } from 'vue'
import { usePrompt } from '../composables/use-prompt'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'

// One kind of page (characters, places or notes) as cards, A to Z, with a card to add one more.
const props = defineProps<{ kind: ReferenceKind }>()
const story = useStoryStore()
const settings = useSettingsStore()
const { ask } = usePrompt()
const t = settings.t
const pages = computed(() => galleryPages(story.references, props.kind, settings.locale))

async function newPage(): Promise<void> {
  const title = await ask(t('prompt-reference-title'))
  if (title) await story.createReference(props.kind, title)
}
</script>

<template>
  <div class="world-gallery">
    <div class="story-head">
      <h1 class="outline-title">{{ t(`story-${kind}`) }}</h1>
    </div>
    <div class="story-page">
      <ul class="gallery" :aria-label="t(`story-${kind}`)" :data-testid="`gallery-${kind}`">
        <li v-for="page in pages" :key="page.file">
          <button type="button" class="page-card" :data-page="page.file" @click="story.showing = { kind: 'page', file: page.file }">
            <span class="page-card-title" dir="auto">{{ page.title }}</span>
            <span v-if="page.aka.length > 0" class="page-card-aka" dir="auto">{{ t('reference-aka', page.aka.join(', ')) }}</span>
            <span v-if="page.description" class="page-card-description" dir="auto">{{ page.description }}</span>
          </button>
        </li>
        <li>
          <button type="button" class="page-card new-page" :data-testid="`new-${kind}`" @click="newPage">{{ t(`new-${kind}`) }}</button>
        </li>
      </ul>
    </div>
  </div>
</template>
