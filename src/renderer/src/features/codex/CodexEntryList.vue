<script setup lang="ts">
import type { CodexEntryDto } from '../../../../contract/dtos'
import { entryDetail } from './codex-sections'
import { isolate } from '../../shared/isolate'

defineProps<{ entries: readonly CodexEntryDto[]; selectedPath: string | null }>()
defineEmits<{ open: [path: string]; edit: [path: string] }>()
</script>

<template>
  <ul>
    <li v-for="entry in entries" :key="entry.path" class="entry-row">
      <button
        type="button"
        class="row"
        :class="{ active: selectedPath === entry.path, character: entry.kind === 'character' }"
        :aria-current="selectedPath === entry.path ? 'true' : undefined"
        :title="entry.path"
        @click="$emit('open', entry.path)"
      >
        <span class="title" dir="auto">{{ entry.title }}</span>
        <span
          v-if="entryDetail(entry)"
          class="meta"
          :class="{ subtitle: entry.kind === 'character' }"
          dir="auto"
          >{{ entryDetail(entry) }}</span
        >
      </button>
      <button
        type="button"
        class="edit"
        :aria-label="`Open ${isolate(entry.title)} in editor`"
        title="Open in editor"
        @click="$emit('edit', entry.path)"
      >
        Edit
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
.entry-row {
  display: flex;
  align-items: center;
}
.row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding: 6px 10px 6px 14px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-dim);
  text-align: start;
}
.row.character {
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
  padding-block: 8px;
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
.meta.subtitle {
  display: -webkit-box;
  max-width: none;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  line-height: 1.5;
}
.edit {
  flex-shrink: 0;
  padding: 5px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
}
.edit:hover,
.edit:focus-visible {
  color: var(--accent);
  background: var(--hover);
}
</style>
