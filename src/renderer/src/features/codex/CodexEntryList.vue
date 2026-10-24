<script setup lang="ts">
import type { CodexEntryDto } from '../../../../contract/dtos'
import { entryDetail } from './codex-sections'
import { isolate } from '../../shared/isolate'
import { useUiLanguageStore } from '../../app/ui-language-store'

defineProps<{ entries: readonly CodexEntryDto[]; selectedPath: string | null }>()
defineEmits<{ open: [path: string]; edit: [path: string] }>()
const language = useUiLanguageStore()
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
          v-if="entry.role || entry.aliases.length > 0"
          class="meta"
          :class="{ subtitle: entry.kind === 'character' }"
          dir="auto"
          >{{ entryDetail(entry, language.t) }}</span
        >
      </button>
      <button
        type="button"
        class="edit"
        :aria-label="language.t('codex-open-editor-label', isolate(entry.title))"
        :title="language.t('codex-open-editor-tooltip')"
        @click="$emit('edit', entry.path)"
      >
        {{ language.t('codex-edit') }}
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
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding-block: var(--space-3);
  padding-inline: var(--space-5) var(--space-3);
  border: none;
  border-radius: var(--radius-field);
  background: transparent;
  color: var(--text-dim);
  text-align: start;
}
.row.character {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
  padding-block: var(--space-3);
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
  font-size: var(--text-caption);
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
  padding: var(--space-2);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-caption);
}
.edit:hover,
.edit:focus-visible {
  color: var(--accent);
  background: var(--hover);
}
</style>
