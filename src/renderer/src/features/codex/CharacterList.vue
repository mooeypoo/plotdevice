<script setup lang="ts">
import { computed } from 'vue'
import type { CodexEntryDto } from '../../../../contract/dtos'
import { useCharacterList } from './use-character-list'
import CodexEntryList from './CodexEntryList.vue'
import { nameKey } from '../../shared/link-choices'

const props = defineProps<{
  entries: readonly CodexEntryDto[]
  projectRoot: string
  selectedPath: string | null
}>()
defineEmits<{ open: [path: string] }>()
const characters = useCharacterList(
  computed(() => props.entries),
  computed(() => props.projectRoot)
)
const { search, names, filters, visible, sections, mode } = characters
</script>

<template>
  <div class="characters">
    <div class="controls">
      <input
        v-model="search"
        type="search"
        aria-label="Search characters"
        placeholder="Find a name or alias…"
        dir="auto"
      />
      <div class="tools">
        <div class="modes" role="group" aria-label="Character list mode">
          <button type="button" :aria-pressed="mode === 'all'" @click="mode = 'all'">All</button>
          <button type="button" :aria-pressed="mode === 'grouped'" @click="mode = 'grouped'">
            Grouped
          </button>
        </div>
        <span class="count" role="status">{{ visible.length }} shown</span>
      </div>
      <details v-if="names.length > 0" class="filters">
        <summary>
          Filter groups<span v-if="filters.length"> · {{ filters.length }}</span>
        </summary>
        <p class="hint">Show characters in any selected group.</p>
        <label v-for="name in names" :key="nameKey(name)">
          <input
            type="checkbox"
            :checked="filters.some((filter) => nameKey(filter) === nameKey(name))"
            @change="characters.toggleFilter(name)"
          />
          <bdi>{{ name }}</bdi>
        </label>
      </details>
      <button
        v-if="filters.length > 0"
        type="button"
        class="clear"
        @click="characters.clearFilters()"
      >
        Clear group filters
      </button>
    </div>
    <p v-if="visible.length === 0" class="hint empty">
      {{
        entries.length === 0
          ? 'No characters yet.'
          : 'No characters match. Clear the search or group filters to see more.'
      }}
    </p>
    <p v-else-if="search.trim() && mode === 'grouped'" class="hint empty">
      Matching groups are expanded while searching.
    </p>
    <section
      v-for="section in mode === 'grouped' ? sections : [{ name: null, entries: visible }]"
      :key="section.name === null ? 'ungrouped' : `group:${nameKey(section.name)}`"
      class="character-group"
    >
      <h3 v-if="mode === 'grouped'">
        <button
          type="button"
          class="group-heading"
          :disabled="search.trim() !== ''"
          :aria-expanded="!characters.collapsed(section.name)"
          @click="characters.toggleCollapsed(section.name)"
        >
          <span aria-hidden="true">{{ characters.collapsed(section.name) ? '▸' : '▾' }}</span>
          <bdi>{{ section.name ?? 'Ungrouped' }}</bdi>
          <span class="count">{{ section.entries.length }}</span>
        </button>
      </h3>
      <CodexEntryList
        v-if="mode === 'all' || !characters.collapsed(section.name)"
        :entries="section.entries"
        :selected-path="selectedPath"
        @open="$emit('open', $event)"
      />
    </section>
  </div>
</template>

<style scoped>
.controls {
  display: grid;
  gap: 8px;
  margin: 8px 4px 10px;
}
input[type='search'] {
  width: 100%;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
.tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.modes {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 6px;
}
.modes button {
  border: none;
  background: transparent;
  padding: 3px 9px;
  font-size: 11px;
  color: var(--text-muted);
}
.modes button[aria-pressed='true'] {
  background: var(--active);
  color: var(--text-strong);
}
.count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}
.filters {
  font-size: 12px;
  color: var(--text-dim);
}
summary {
  cursor: pointer;
  padding-block: 3px;
}
.filters label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 2px;
  overflow-wrap: anywhere;
}
.filters input {
  margin: 0;
  accent-color: var(--accent);
}
.hint {
  margin: 4px 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted);
}
.empty {
  margin: 8px;
}
.clear {
  justify-self: start;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 11px;
}
h3 {
  margin: 8px 0 2px;
}
.group-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 5px 8px;
  border: none;
  background: transparent;
  text-align: start;
  color: var(--text-dim);
  font-size: 12px;
}
.group-heading bdi {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.group-heading:hover {
  background: var(--hover);
}
</style>
