<script setup lang="ts">
import type { ChapterRef, ProjectView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { nextTick, toRef } from 'vue'
import { useNavigator } from '../composables/use-navigator'
import { useSettingsStore } from '../stores/settings'
import MenuButton from './MenuButton.vue'

const props = defineProps<{ project: ProjectView; openFile: ProjectPath | null }>()
const emit = defineEmits<{ open: [file: ProjectPath] }>()
const settings = useSettingsStore()
const t = settings.t
const nav = useNavigator(toRef(props, 'project'), toRef(props, 'openFile'), (file) => emit('open', file))

async function onKey(event: KeyboardEvent, chapter: ChapterRef): Promise<void> {
  if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
  event.preventDefault()
  await nav.moveWithKeyboard(event, chapter.file)
  await nextTick()
}
</script>

<template>
  <nav class="navigator" :aria-label="t('navigator-label')" data-testid="navigator">
    <p v-if="project.contents.length === 0" class="secondary">{{ t('navigator-no-chapters') }}</p>
    <ol class="contents">
      <template v-for="(entry, index) in project.contents" :key="entry.kind === 'part' ? `part-${index}` : entry.file">
        <li v-if="entry.kind === 'part'" class="part">
          <div class="row part-row">
            <span class="part-name" dir="auto">{{ entry.name }}</span>
            <MenuButton :label="t('part-actions', entry.name)" :items="[{ key: 'rename-part', label: t('part-rename'), run: () => nav.renamePart(index, entry.name) }]" />
          </div>
          <ol>
            <li v-for="chapter in entry.chapters" :key="chapter.file">
              <div class="row chapter-row" :class="{ current: chapter.file === openFile, missing: nav.isMissing(chapter.file) }">
                <button
                  type="button"
                  class="chapter"
                  :data-chapter="chapter.file"
                  :aria-current="chapter.file === openFile ? 'page' : undefined"
                  @click="emit('open', chapter.file)"
                  @keydown="onKey($event, chapter)"
                >
                  <span v-if="chapter.number !== null" class="number">{{ chapter.number }}</span>
                  <span dir="auto">{{ chapter.linkText }}</span>
                </button>
                <MenuButton :label="t('chapter-actions', chapter.linkText)" :items="nav.chapterMenu(chapter)" />
              </div>
              <button v-if="nav.outdatedTitle(chapter.file)" type="button" class="link-button" @click="nav.updateTitle(chapter.file)">
                {{ t('navigator-update-title', nav.outdatedTitle(chapter.file) ?? '') }}
              </button>
            </li>
          </ol>
        </li>
        <li v-else>
          <div class="row chapter-row" :class="{ current: entry.file === openFile, missing: nav.isMissing(entry.file) }">
            <button
              type="button"
              class="chapter"
              :data-chapter="entry.file"
              :aria-current="entry.file === openFile ? 'page' : undefined"
              @click="emit('open', entry.file)"
              @keydown="onKey($event, entry)"
            >
              <span v-if="entry.number !== null" class="number">{{ entry.number }}</span>
              <span dir="auto">{{ entry.linkText }}</span>
            </button>
            <MenuButton :label="t('chapter-actions', entry.linkText)" :items="nav.chapterMenu(entry)" />
          </div>
          <button v-if="nav.outdatedTitle(entry.file)" type="button" class="link-button" @click="nav.updateTitle(entry.file)">
            {{ t('navigator-update-title', nav.outdatedTitle(entry.file) ?? '') }}
          </button>
        </li>
      </template>
    </ol>

    <div class="actions start">
      <button type="button" data-testid="new-chapter" @click="nav.addChapter">{{ t('navigator-new-chapter') }}</button>
      <button type="button" @click="nav.addPart">{{ t('navigator-new-part') }}</button>
    </div>

    <section v-if="nav.missing.value.length > 0" class="navigator-section">
      <h2>{{ t('navigator-missing') }}</h2>
      <ul>
        <li v-for="item in nav.missing.value" :key="item.file" class="row">
          <span dir="ltr" class="secondary">{{ item.file }}</span>
          <button v-if="item.suggestion" type="button" class="link-button" @click="nav.relink(item.file, item.suggestion)">{{ t('navigator-relink', item.suggestion) }}</button>
        </li>
      </ul>
    </section>

    <section v-if="nav.unlisted.value.length > 0" class="navigator-section" data-testid="not-in-book">
      <h2>{{ t('navigator-not-in-book') }}</h2>
      <ul>
        <li v-for="chapter in nav.unlisted.value" :key="chapter.file" class="row chapter-row" :class="{ current: chapter.file === openFile }">
          <button type="button" class="chapter" :data-chapter="chapter.file" @click="emit('open', chapter.file)">
            <span dir="auto">{{ chapter.title ?? chapter.file }}</span>
          </button>
          <button type="button" class="link-button" @click="nav.addToBook(chapter.file)">{{ t('navigator-add-to-book') }}</button>
        </li>
      </ul>
    </section>
  </nav>
</template>
