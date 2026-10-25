<script setup lang="ts">
import type { ProjectView } from '@plotdevice/contracts'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'

// The book's reading order, from CONTENTS.md: a view, not a second copy. Arranging happens in Write.
defineProps<{ project: ProjectView }>()
const settings = useSettingsStore()
const view = useViewStore()
</script>

<template>
  <section class="manuscript-outline" data-testid="manuscript-outline">
    <h2>{{ settings.t('story-manuscript') }}</h2>
    <p class="secondary">{{ settings.t('story-manuscript-hint') }}</p>
    <ol>
      <template v-for="(entry, index) in project.contents" :key="index">
        <li v-if="entry.kind === 'part'" class="part">
          <span class="part-name" dir="auto">{{ entry.name }}</span>
          <ol>
            <li v-for="chapter in entry.chapters" :key="chapter.file">
              <button type="button" class="chapter" @click="view.writeChapter(chapter.file)">
                <span v-if="chapter.number !== null" class="number">{{ chapter.number }}</span><span dir="auto">{{ chapter.linkText }}</span>
              </button>
            </li>
          </ol>
        </li>
        <li v-else>
          <button type="button" class="chapter" @click="view.writeChapter(entry.file)">
            <span v-if="entry.number !== null" class="number">{{ entry.number }}</span><span dir="auto">{{ entry.linkText }}</span>
          </button>
        </li>
      </template>
    </ol>
  </section>
</template>
