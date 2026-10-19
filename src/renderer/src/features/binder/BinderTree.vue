<script setup lang="ts">
import type { ManuscriptDto } from '../../../../contract/dtos'
import { describeUnorderedReason, formatWordCount } from './binder-labels'
import BinderPart from './BinderPart.vue'
import BinderRow from './BinderRow.vue'

defineProps<{
  manuscript: ManuscriptDto
  selectedPath: string | null
  /** How many files or warnings need the writer's attention. */
  attentionCount: number
}>()

defineEmits<{
  open: [path: string]
  showOverview: []
}>()
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
        @open="$emit('open', $event)"
      />

      <ul v-if="manuscript.chapters.length > 0" class="flat">
        <li v-for="chapter in manuscript.chapters" :key="chapter.path">
          <BinderRow
            :title="chapter.title"
            :number="chapter.number"
            :status="chapter.status"
            :word-count="chapter.wordCount"
            :active="selectedPath === chapter.path"
            :warning="chapter.duplicateOrder ? 'Shares its order with another chapter' : undefined"
            @open="$emit('open', chapter.path)"
          />
        </li>
      </ul>

      <p
        v-if="
          manuscript.parts.length === 0 &&
          manuscript.chapters.length === 0 &&
          manuscript.unnumberedParts.length === 0 &&
          manuscript.unordered.length === 0
        "
        class="empty"
      >
        No parts or chapters yet. Files with <code>type: chapter</code> in their frontmatter appear
        here.
      </p>

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
          @open="$emit('open', $event)"
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
