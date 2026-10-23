<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ManuscriptDto } from '../../../../contract/dtos'
import { clashDescription, describeUnorderedReason } from '../../shared/manuscript-labels'
import BinderPart from './BinderPart.vue'
import BinderRow from './BinderRow.vue'
import NewEntryInput from '../../shared/NewEntryInput.vue'
import type { DropRequest, DropSpot } from './binder-drop'
import { provideBinderDrag } from './use-binder-drag'
import { useBinderCollapse } from './use-binder-collapse'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'

const language = useUiLanguageStore()
const chrome = useChromePresentation()

const props = defineProps<{
  projectRoot: string
  manuscript: ManuscriptDto
  selectedPath: string | null
  readOnly: boolean
}>()

const emit = defineEmits<{
  open: [path: string]
  reference: [path: string]
  createChapter: [partPath: string | null, title: string]
  createPart: [title: string]
  move: [request: DropRequest]
}>()

const drag = provideBinderDrag((request) => {
  emit('move', request)
})
const collapse = useBinderCollapse(() => props.projectRoot)
const partPaths = computed(() => props.manuscript.parts.map((part) => part.path))
const flatPaths = computed(() => props.manuscript.chapters.map((chapter) => chapter.path))
const lastFlat = computed(() => props.manuscript.chapters.length - 1)

function flatSpot(slot: number): DropSpot {
  return { kind: 'chapters', part: null, paths: flatPaths.value, slot }
}

const unorderedSpot: DropSpot = { kind: 'unordered' }
/** A chapter that has an order is being dragged, so the tray can take it. */
const draggingOrdered = computed(() => {
  const dragged = drag.dragged.value
  return (
    dragged?.kind === 'chapter' &&
    !props.manuscript.unordered.some((item) => item.chapter.path === dragged.path)
  )
})
const overTray = computed(() => drag.spot.value?.kind === 'unordered')

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
  <nav class="binder" :aria-label="language.t('chrome-binder')" @dragover="drag.clear">
    <div class="scroll">
      <BinderPart
        v-for="(part, index) in manuscript.parts"
        :key="part.path"
        :part="part"
        :expanded="collapse.isExpanded(part.path)"
        :selected-path="selectedPath"
        :read-only="readOnly"
        :part-paths="partPaths"
        :part-index="index"
        @open="$emit('open', $event)"
        @reference="$emit('reference', $event)"
        @set-expanded="collapse.setExpanded(part.path, $event)"
        @create-chapter="(part, title) => $emit('createChapter', part, title)"
      />

      <ul v-if="manuscript.chapters.length > 0" class="flat">
        <li
          v-for="(chapter, index) in manuscript.chapters"
          :key="chapter.path"
          :class="{
            'gap-before': drag.isChapterGap(null, index),
            'gap-after': index === lastFlat && drag.isChapterGap(null, index + 1)
          }"
          :draggable="!readOnly"
          @dragstart="drag.start({ kind: 'chapter', path: chapter.path }, $event)"
          @dragend="drag.end()"
          @dragover="drag.overRow(flatSpot, index, $event)"
          @drop="drag.drop"
        >
          <BinderRow
            :title="chapter.title"
            :number="chapter.number"
            :status="chapter.status"
            :word-count="chapter.wordCount"
            :active="selectedPath === chapter.path"
            :warning="clashDescription(chapter, manuscript.chapters, language.t)"
            @open="$emit('open', chapter.path)"
            @reference="$emit('reference', chapter.path)"
          />
        </li>
      </ul>

      <div v-if="empty && adding === null" class="empty">
        <p>{{ language.t('binder-empty-copy') }}</p>
        <div v-if="!readOnly" class="start">
          <button type="button" class="primary" @click="adding = 'chapter'">
            {{ language.t('binder-empty-new-chapter') }}
          </button>
          <button type="button" @click="adding = 'part'">
            {{ language.t('binder-empty-new-part') }}
          </button>
        </div>
      </div>

      <NewEntryInput
        v-if="adding === 'chapter'"
        :placeholder="language.t('binder-chapter-title')"
        @create="createChapter"
        @cancel="adding = null"
      />
      <NewEntryInput
        v-if="adding === 'part'"
        :placeholder="language.t('binder-part-title')"
        @create="createPart"
        @cancel="adding = null"
      />

      <div v-if="!empty && !readOnly && adding === null" class="actions">
        <button v-if="!hasParts" type="button" class="quiet" @click="adding = 'chapter'">
          + {{ language.t('binder-new-chapter') }}
        </button>
        <button type="button" class="quiet" @click="adding = 'part'">
          + {{ language.t('binder-new-part') }}
        </button>
      </div>

      <template v-if="manuscript.unnumberedParts.length > 0">
        <div class="divider">
          <span class="eyebrow">{{ language.t('binder-not-in-sequence') }}</span>
          <span class="rule" aria-hidden="true"></span>
        </div>
        <BinderPart
          v-for="part in manuscript.unnumberedParts"
          :key="part.path"
          :part="part"
          :expanded="collapse.isExpanded(part.path)"
          :selected-path="selectedPath"
          :read-only="readOnly"
          :part-paths="partPaths"
          @open="$emit('open', $event)"
          @reference="$emit('reference', $event)"
          @set-expanded="collapse.setExpanded(part.path, $event)"
          @create-chapter="(part, title) => $emit('createChapter', part, title)"
        />
      </template>

      <template v-if="manuscript.unordered.length > 0 || draggingOrdered">
        <div
          class="tray"
          :class="{ over: overTray }"
          @dragover="drag.over(unorderedSpot, $event)"
          @drop="drag.drop"
        >
          <div class="divider">
            <span class="eyebrow">{{ language.t('binder-unordered') }}</span>
            <span class="rule" aria-hidden="true"></span>
            <span v-if="manuscript.unordered.length > 0" class="count">
              {{ chrome.formatNumber(manuscript.unordered.length) }}
            </span>
          </div>
          <ul class="flat">
            <li
              v-for="item in manuscript.unordered"
              :key="item.chapter.path"
              :draggable="!readOnly"
              @dragstart="drag.start({ kind: 'chapter', path: item.chapter.path }, $event)"
              @dragend="drag.end()"
            >
              <BinderRow
                :title="item.chapter.title"
                :status="item.chapter.status"
                :word-count="item.chapter.wordCount"
                :active="selectedPath === item.chapter.path"
                :detail="describeUnorderedReason(item.reason, language.t)"
                @open="$emit('open', item.chapter.path)"
                @reference="$emit('reference', item.chapter.path)"
              />
            </li>
          </ul>
          <p v-if="manuscript.unordered.length === 0" class="tray-hint">
            {{ language.t('binder-drop-unordered') }}
          </p>
        </div>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.flat li {
  border-radius: 7px;
}

.gap-before {
  box-shadow: inset 0 2px 0 var(--accent);
}

.gap-after {
  box-shadow: inset 0 -2px 0 var(--accent);
}

.tray {
  border-radius: 8px;
  padding-bottom: 4px;
}

.tray.over {
  background: var(--hover);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.tray-hint {
  margin: 0 8px;
  padding: 10px 0;
  font-size: 12px;
  color: var(--text-muted);
}

.binder {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 10px 10px;
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
</style>
