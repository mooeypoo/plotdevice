<script setup lang="ts">
import type { CodexEntryDto } from '../../../../contract/dtos'
import { entryDetail } from './codex-sections'

defineProps<{ entries: readonly CodexEntryDto[]; selectedPath: string | null }>()
defineEmits<{ open: [path: string] }>()
</script>

<template>
  <ul>
    <li v-for="entry in entries" :key="entry.path">
      <button
        type="button"
        class="row"
        :class="{ active: selectedPath === entry.path }"
        :aria-current="selectedPath === entry.path ? 'true' : undefined"
        :title="entry.path"
        @click="$emit('open', entry.path)"
      >
        <span class="title" dir="auto">{{ entry.title }}</span>
        <span v-if="entryDetail(entry)" class="meta" dir="auto">{{ entryDetail(entry) }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 6px 10px 6px 14px;
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
.title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  flex-shrink: 0;
  max-width: 45%;
  overflow: hidden;
  font-size: 11px;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
