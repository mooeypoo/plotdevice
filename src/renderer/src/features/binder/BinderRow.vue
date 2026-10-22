<script setup lang="ts">
import { formatWordCount, statusColor } from './binder-labels'
import ReferenceButton from '../../shared/ReferenceButton.vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'

const language = useUiLanguageStore()
const chrome = useChromePresentation()

defineProps<{
  title: string
  number?: number | undefined
  status?: string | undefined
  wordCount: number
  active: boolean
  /** Shown instead of the word count, for unordered chapters. */
  detail?: string | undefined
  warning?: string | undefined
}>()

defineEmits<{ open: []; reference: [] }>()
</script>

<template>
  <div class="entry-row">
    <button
      type="button"
      class="row"
      :class="{ active }"
      :aria-current="active ? 'true' : undefined"
      @click="$emit('open')"
    >
      <span class="number">{{ number ?? '' }}</span>
      <span
        class="status"
        :style="{ background: statusColor(status) }"
        :title="status ?? language.t('binder-no-status')"
        aria-hidden="true"
      ></span>
      <span class="title" dir="auto">{{ title }}</span>
      <span v-if="warning" class="warning" :title="warning" role="img" :aria-label="warning"
        >!</span
      >
      <span class="meta">{{ detail ?? formatWordCount(wordCount, chrome.formatNumber) }}</span>
    </button>
    <ReferenceButton :title="title" @open="$emit('reference')" />
  </div>
</template>

<style scoped>
.entry-row {
  display: flex;
  align-items: center;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding: 0 10px 0 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-dim);
  text-align: start;
}

.row:hover:not(.active) {
  background: var(--hover);
  color: var(--text);
}

.row.active {
  background: var(--active);
  color: var(--text-strong);
}

.number {
  flex-shrink: 0;
  width: 20px;
  font-size: 11px;
  text-align: end;
  color: var(--text-muted);
}

.active .number {
  color: var(--accent);
}

.status {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.title {
  flex: 1;
  min-width: 0;
  /* Hebrew titles keep their own direction but line up with the rest of the list. */
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warning {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--warning);
  font-size: 10px;
  font-weight: 600;
}

.meta {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
