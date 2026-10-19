<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ManuscriptDto } from '../../../../contract/dtos'
import { clashDescription, describeUnorderedReason, formatWordCount } from './binder-labels'
import BinderPart from './BinderPart.vue'
import BinderRow from './BinderRow.vue'
import NewEntryInput from './NewEntryInput.vue'

const props = defineProps<{
  manuscript: ManuscriptDto
  selectedPath: string | null
  /** How many files or warnings need the writer's attention. */
  attentionCount: number
  readOnly: boolean
}>()

const emit = defineEmits<{
  open: [path: string]
  showOverview: []
  createChapter: [partPath: string | null, title: string]
  createPart: [title: string]
}>()

// Which inline title box is open: a new part, or a chapter in a book without parts.
const adding = ref<'part' | 'chapter' | null>(null)

const empty = computed(
  () =>
    props.manuscript.parts.length === 0 &&
    props.manuscript.chapters.length === 0 &&
    props.manuscript.unnumberedParts.length === 0 &&
    props.manuscript.unordered.length === 0
)
const hasParts = computed(
  () => props.manuscript.parts.length > 0 || props.manuscript.unnumberedParts.length > 0
)

function createPart(title: string): void {
  adding.value = null
  emit('createPart', title)
}

function createChapter(title: string): void {
  adding.value = null
  emit('createChapter', null, title)
}
</script>

<template>
  <nav class="binder" aria-label="Binder">
    <div class="scroll">
      <div class="eyebrow heading">Manuscript</div>

      <BinderPart
        v-for="part in manuscript.parts"
        :key="part.path"
        :part="part"
        :selected-path="selectedPath"
        :read-only="readOnly"
        @open="$emit('open', $event)"
        @create-chapter="(part, title) => $emit('createChapter', part, title)"
      />

      <ul v-if="manuscript.chapters.length > 0" class="flat">
        <li v-for="chapter in manuscript.chapters" :key="chapter.path">
          <BinderRow
            :title="chapter.title"
            :number="chapter.number"
            :status="chapter.status"
            :word-count="chapter.wordCount"
            :active="selectedPath === chapter.path"
            :warning="clashDescription(chapter, manuscript.chapters)"
            @open="$emit('open', chapter.path)"
          />
        </li>
      </ul>

      <div v-if="empty && adding === null" class="empty">
        <p>No chapters yet. Start with a chapter, or with a part if your book has parts.</p>
        <div v-if="!readOnly" class="start">
          <button type="button" class="primary" @click="adding = 'chapter'">New chapter</button>
          <button type="button" @click="adding = 'part'">New part</button>
        </div>
      </div>

      <NewEntryInput
        v-if="adding === 'chapter'"
        placeholder="Chapter title"
        @create="createChapter"
        @cancel="adding = null"
      />
      <NewEntryInput
        v-if="adding === 'part'"
        placeholder="Part title"
        @create="createPart"
        @cancel="adding = null"
      />

      <div v-if="!empty && !readOnly && adding === null" class="actions">
        <button v-if="!hasParts" type="button" class="quiet" @click="adding = 'chapter'">
          + New chapter
        </button>
        <button type="button" class="quiet" @click="adding = 'part'">+ New part</button>
      </div>

      <template v-if="manuscript.unnumberedParts.length > 0">
        <div class="divider">
          <span class="eyebrow">Not in sequence</span>
          <span class="rule" aria-hidden="true"></span>
        </div>
        <BinderPart
          v-for="part in manuscript.unnumberedParts"
          :key="part.path"
          :part="part"
          :selected-path="selectedPath"
          :read-only="readOnly"
          @open="$emit('open', $event)"
          @create-chapter="(part, title) => $emit('createChapter', part, title)"
        />
      </template>

      <template v-if="manuscript.unordered.length > 0">
        <div class="divider">
          <span class="eyebrow">Unordered</span>
          <span class="rule" aria-hidden="true"></span>
          <span class="count">{{ manuscript.unordered.length }}</span>
        </div>
        <ul class="flat">
          <li v-for="item in manuscript.unordered" :key="item.chapter.path">
            <BinderRow
              :title="item.chapter.title"
              :status="item.chapter.status"
              :word-count="item.chapter.wordCount"
              :active="selectedPath === item.chapter.path"
              :detail="describeUnorderedReason(item.reason)"
              @open="$emit('open', item.chapter.path)"
            />
          </li>
        </ul>
      </template>
    </div>

    <footer>
      <button
        v-if="attentionCount > 0"
        type="button"
        class="attention"
        @click="$emit('showOverview')"
      >
        <span class="dot" aria-hidden="true"></span>
        {{ attentionCount }} {{ attentionCount === 1 ? 'thing needs' : 'things need' }} attention
      </button>
      <div class="total">
        <span>Manuscript</span>
        <span class="value">{{ formatWordCount(manuscript.wordCount) }} words</span>
      </div>
    </footer>
  </nav>
</template>

<style scoped>
.binder {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  border-inline-end: 1px solid var(--line);
  background: var(--panel);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 10px 10px;
}

.heading {
  padding: 0 8px 10px;
}

.flat {
  margin: 0;
  padding: 0;
  list-style: none;
}

.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 8px 6px;
}

.rule {
  flex: 1;
  height: 1px;
  background: var(--line-strong);
}

.count {
  font-size: 11px;
  color: var(--text-muted);
}

.empty {
  margin: 8px;
  line-height: 1.5;
  color: var(--text-muted);
}

.empty p {
  margin: 0 0 12px;
}

.start {
  display: flex;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 4px;
  margin: 10px 0 0;
}

.actions button {
  padding: 6px 10px;
  font-size: 12px;
}

footer {
  border-top: 1px solid var(--line);
}

.attention {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 18px;
  border: none;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  color: var(--text-dim);
  font-size: 12px;
  text-align: start;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning);
}

.total {
  display: flex;
  justify-content: space-between;
  padding: 12px 18px;
  font-size: 12px;
  color: var(--text-muted);
}

.value {
  color: var(--text);
}
</style>
