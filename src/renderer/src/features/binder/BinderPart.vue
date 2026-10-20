<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PartDto } from '../../../../contract/dtos'
import { clashDescription, formatWordCount, romanNumeral } from './binder-labels'
import BinderRow from './BinderRow.vue'
import NewEntryInput from './NewEntryInput.vue'
import type { DropSpot } from './binder-drop'
import { useBinderDrag } from './use-binder-drag'

const props = defineProps<{
  part: PartDto
  expanded: boolean
  selectedPath: string | null
  readOnly: boolean
  /** The numbered parts' paths, in order, for dragging parts. */
  partPaths: readonly string[]
  /** This part's position among them; absent for a part outside the sequence. */
  partIndex?: number | undefined
}>()

const emit = defineEmits<{
  open: [path: string]
  createChapter: [partPath: string, title: string]
  setExpanded: [expanded: boolean]
}>()

const drag = useBinderDrag()
const chapterPaths = computed(() => props.part.chapters.map((chapter) => chapter.path))
const lastChapter = computed(() => props.part.chapters.length - 1)

function chapterSpot(slot: number): DropSpot {
  return { kind: 'chapters', part: props.part.path, paths: chapterPaths.value, slot }
}

function partSpot(slot: number): DropSpot {
  return { kind: 'parts', paths: props.partPaths, slot }
}

/** Over the header, a part lands above or below this one; a chapter lands at the end of it. */
function overHeader(event: DragEvent): void {
  if (drag.dragged.value?.kind === 'part') {
    if (props.partIndex !== undefined) drag.overRow(partSpot, props.partIndex, event)
  } else {
    drag.over(chapterSpot(props.part.chapters.length), event)
  }
}

const droppingInto = computed(
  () =>
    drag.isChapterGap(props.part.path, props.part.chapters.length) &&
    (!props.expanded || props.part.chapters.length === 0)
)
const partGapBefore = computed(
  () => props.partIndex !== undefined && drag.isPartGap(props.partIndex)
)
const partGapAfter = computed(
  () =>
    props.partIndex !== undefined &&
    props.partIndex === props.partPaths.length - 1 &&
    drag.isPartGap(props.partIndex + 1)
)

const adding = ref(false)

function startAdding(): void {
  emit('setExpanded', true)
  adding.value = true
}

function create(title: string): void {
  adding.value = false
  emit('createChapter', props.part.path, title)
}
// Computed, not read once: the same component shows a new number after the parts are reordered.
const marker = computed(() =>
  props.part.number === undefined ? '◇' : romanNumeral(props.part.number)
)
</script>

<template>
  <section class="part" :class="{ 'gap-before': partGapBefore, 'gap-after': partGapAfter }">
    <div
      class="header"
      :class="{ active: selectedPath === part.path, 'drop-into': droppingInto }"
      :draggable="!readOnly"
      @dragstart="drag.start({ kind: 'part', path: part.path }, $event)"
      @dragend="drag.end()"
      @dragover="overHeader"
      @drop="drag.drop"
    >
      <button
        type="button"
        class="toggle"
        :aria-expanded="expanded"
        :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${part.title}`"
        @click="$emit('setExpanded', !expanded)"
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
      <li
        v-for="(chapter, index) in part.chapters"
        :key="chapter.path"
        :class="{
          'gap-before': drag.isChapterGap(part.path, index),
          'gap-after': index === lastChapter && drag.isChapterGap(part.path, index + 1)
        }"
        :draggable="!readOnly"
        @dragstart="drag.start({ kind: 'chapter', path: chapter.path }, $event)"
        @dragend="drag.end()"
        @dragover="drag.overRow(chapterSpot, index, $event)"
        @drop="drag.drop"
      >
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
  border-radius: 7px;
}

/* Drop indicators: a line in the gap where the dragged entry would land. */
.gap-before {
  box-shadow: inset 0 2px 0 var(--accent);
}

.gap-after {
  box-shadow: inset 0 -2px 0 var(--accent);
}

.header.drop-into {
  background: var(--hover);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.chapters li {
  border-radius: 7px;
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
