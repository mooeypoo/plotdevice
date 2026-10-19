<script setup lang="ts">
import { ref } from 'vue'
import type { PartDto } from '../../../../contract/dtos'
import { clashDescription, formatWordCount, romanNumeral } from './binder-labels'
import BinderRow from './BinderRow.vue'
import NewEntryInput from './NewEntryInput.vue'

const props = defineProps<{
  part: PartDto
  selectedPath: string | null
  readOnly: boolean
}>()

const emit = defineEmits<{
  open: [path: string]
  createChapter: [partPath: string, title: string]
}>()

const expanded = ref(true)
const adding = ref(false)

function startAdding(): void {
  expanded.value = true
  adding.value = true
}

function create(title: string): void {
  adding.value = false
  emit('createChapter', props.part.path, title)
}
const marker = props.part.number === undefined ? '◇' : romanNumeral(props.part.number)
</script>

<template>
  <section class="part">
    <div class="header" :class="{ active: selectedPath === part.path }">
      <button
        type="button"
        class="toggle"
        :aria-expanded="expanded"
        :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${part.title}`"
        @click="expanded = !expanded"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          :style="{ transform: expanded ? 'rotate(90deg)' : 'none' }"
        >
          <path d="M9 6l6 6-6 6"></path>
        </svg>
      </button>
      <button
        type="button"
        class="open"
        :title="`Open the text of ${part.title}`"
        @click="$emit('open', part.path)"
      >
        <span class="marker">{{ marker }}</span>
        <span class="title" dir="auto">{{ part.title }}</span>
        <span class="words">{{ formatWordCount(part.wordCount) }}</span>
      </button>
      <button
        v-if="!readOnly"
        type="button"
        class="add"
        :aria-label="`New chapter in ${part.title}`"
        title="New chapter"
        @click="startAdding"
      >
        +
      </button>
    </div>
    <ul v-if="expanded" class="chapters">
      <li v-for="chapter in part.chapters" :key="chapter.path">
        <BinderRow
          :title="chapter.title"
          :number="chapter.number"
          :status="chapter.status"
          :word-count="chapter.wordCount"
          :active="selectedPath === chapter.path"
          :warning="clashDescription(chapter, part.chapters)"
          @open="$emit('open', chapter.path)"
        />
      </li>
      <li v-if="adding">
        <NewEntryInput placeholder="Chapter title" @create="create" @cancel="adding = false" />
      </li>
      <li v-else-if="!readOnly">
        <button type="button" class="new-chapter" @click="startAdding">+ New chapter</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.part {
  margin-bottom: 8px;
}

.header {
  display: flex;
  align-items: center;
  border-radius: 7px;
}

.new-chapter {
  width: 100%;
  min-height: 30px;
  padding: 0 8px 0 36px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  text-align: start;
}

.new-chapter:hover {
  color: var(--text);
}

.add {
  width: 26px;
  height: 26px;
  margin-inline-end: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  opacity: 0.5;
}

.header:hover .add,
.add:focus-visible {
  opacity: 1;
}

.header.active {
  background: var(--active);
}

.toggle {
  display: grid;
  place-items: center;
  width: 22px;
  height: 30px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
}

.toggle svg {
  transition: transform 120ms ease;
}

.open {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding: 6px 10px 6px 0;
  border: none;
  background: transparent;
  text-align: start;
}

.open:hover .title {
  color: var(--text-strong);
}

.marker {
  min-width: 20px;
  font-family: var(--font-prose);
  font-size: 12px;
  color: var(--text-muted);
}

.title {
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  font-weight: 500;
  color: var(--text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.words {
  font-size: 11px;
  color: var(--text-muted);
}

.chapters {
  margin: 0;
  padding: 0 0 0 14px;
  list-style: none;
}

.empty {
  padding: 6px 10px 6px 36px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
