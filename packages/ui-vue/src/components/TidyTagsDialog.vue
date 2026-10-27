<script setup lang="ts">
import type { ProjectPath } from '@plotdevice/shared'
import { nextTick, ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'

// "Tidy tags" (Milestone 12, decision 6): tags that look like one, to merge, and pages whose tags
// can't be read, to open. Each fix is a button the author presses; the list follows as they go.
const story = useStoryStore()
const view = useViewStore()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const done = ref<HTMLButtonElement | null>(null)

watch(
  () => story.tidying,
  async (open) => {
    if (!open) return dialog.value?.close()
    dialog.value?.showModal()
    await nextTick()
    dialog.value?.querySelector<HTMLButtonElement>('.tidy-list button')?.focus() ?? done.value?.focus()
  },
)

function merge(from: string, into: string): void {
  void story.retag(from, into)
}

function openPage(file: ProjectPath): void {
  story.tidying = false
  story.showing = { kind: 'page', file }
  view.workspace = 'story'
}
</script>

<template>
  <dialog ref="dialog" class="dialog tidy-tags" data-testid="tidy-tags" :aria-label="t('tidy-tags-title')" @close="story.tidying = false">
    <h2>{{ t('tidy-tags-title') }}</h2>
    <section v-if="story.problems.duplicates.length > 0">
      <h3 class="group-label">{{ t('tidy-duplicates') }}</h3>
      <ul class="tidy-list">
        <li v-for="pair in story.problems.duplicates" :key="pair.key" class="tidy-pair" data-testid="tidy-pair">
          <span class="tidy-tags-pair">
            <span v-for="tag in pair.tags" :key="tag.tag" class="tag-pill" dir="auto"
              >{{ tag.tag }} <span class="secondary">{{ t('gallery-pages', String(tag.pages)) }}</span></span
            >
          </span>
          <span class="tidy-actions">
            <button type="button" @click="merge(pair.tags[1].tag, pair.tags[0].tag)">{{ t('tidy-merge-into', pair.tags[0].tag) }}</button>
            <button type="button" @click="merge(pair.tags[0].tag, pair.tags[1].tag)">{{ t('tidy-merge-into', pair.tags[1].tag) }}</button>
          </span>
        </li>
      </ul>
    </section>
    <section v-if="story.problems.unreadable.length > 0">
      <h3 class="group-label">{{ t('tidy-unreadable') }}</h3>
      <ul class="tidy-list">
        <li v-for="page in story.problems.unreadable" :key="page.file" class="tidy-pair">
          <span dir="auto">{{ page.title }}</span>
          <button type="button" @click="openPage(page.file)">{{ t('tidy-open-page') }}</button>
        </li>
      </ul>
    </section>
    <p v-if="story.problems.keys.length === 0" class="secondary" data-testid="tidy-done">{{ t('tidy-done') }}</p>
    <div class="actions">
      <button ref="done" type="button" @click="story.tidying = false">{{ t('tidy-close') }}</button>
    </div>
  </dialog>
</template>
