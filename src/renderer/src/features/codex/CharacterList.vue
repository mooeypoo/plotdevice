<script setup lang="ts">
import { computed } from 'vue'
import type { CodexEntryDto } from '../../../../contract/dtos'
import { useCharacterList } from './use-character-list'
import CodexEntryList from './CodexEntryList.vue'
import CheckboxField from '../../shared/CheckboxField.vue'
import { nameKey } from '../../shared/link-choices'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'

const props = defineProps<{
  entries: readonly CodexEntryDto[]
  projectRoot: string
  selectedPath: string | null
}>()
defineEmits<{ open: [path: string]; edit: [path: string] }>()
const characters = useCharacterList(
  computed(() => props.entries),
  computed(() => props.projectRoot)
)
const { search, names, filters, visible, sections, mode } = characters
const language = useUiLanguageStore()
const chrome = useChromePresentation()
</script>

<template>
  <div class="characters">
    <div class="controls">
      <input
        v-model="search"
        type="search"
        :aria-label="language.t('codex-search-characters')"
        :placeholder="language.t('codex-search-placeholder')"
        dir="auto"
      />
      <div class="tools">
        <div class="modes" role="group" :aria-label="language.t('codex-list-mode')">
          <button type="button" :aria-pressed="mode === 'all'" @click="mode = 'all'">
            {{ language.t('codex-all') }}
          </button>
          <button type="button" :aria-pressed="mode === 'grouped'" @click="mode = 'grouped'">
            {{ language.t('codex-grouped') }}
          </button>
        </div>
        <span class="count" role="status">{{
          language.t('codex-shown-count', visible.length, chrome.formatNumber(visible.length))
        }}</span>
      </div>
      <details v-if="names.length > 0" class="filters">
        <summary>
          {{ language.t('codex-filter-groups')
          }}<span v-if="filters.length"> · {{ chrome.formatNumber(filters.length) }}</span>
        </summary>
        <p class="hint">{{ language.t('codex-filter-groups-hint') }}</p>
        <CheckboxField
          v-for="name in names"
          :key="nameKey(name)"
          :model-value="filters.some((filter) => nameKey(filter) === nameKey(name))"
          @update:model-value="characters.toggleFilter(name)"
        >
          <bdi>{{ name }}</bdi>
        </CheckboxField>
      </details>
      <button
        v-if="filters.length > 0"
        type="button"
        class="clear"
        @click="characters.clearFilters()"
      >
        {{ language.t('codex-clear-group-filters') }}
      </button>
    </div>
    <p v-if="visible.length === 0" class="hint empty">
      {{ entries.length === 0 ? language.t('codex-no-characters') : language.t('codex-no-match') }}
    </p>
    <p v-else-if="search.trim() && mode === 'grouped'" class="hint empty">
      {{ language.t('codex-searching-grouped') }}
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
          <bdi>{{ section.name ?? language.t('codex-ungrouped') }}</bdi>
          <span class="count">{{ chrome.formatNumber(section.entries.length) }}</span>
        </button>
      </h3>
      <CodexEntryList
        v-if="mode === 'all' || !characters.collapsed(section.name)"
        :entries="section.entries"
        :selected-path="selectedPath"
        @open="$emit('open', $event)"
        @edit="$emit('edit', $event)"
      />
    </section>
  </div>
</template>

<style scoped>
.controls {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-3) var(--space-2) var(--space-3);
}
input[type='search'] {
  width: 100%;
  min-width: 0;
  padding: var(--space-3) var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-field);
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: var(--text-small);
}
.tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.modes {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--line);
  border-radius: var(--radius-field);
}
.modes button {
  border: none;
  background: transparent;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-caption);
  color: var(--text-muted);
}
.modes button[aria-pressed='true'] {
  background: var(--active);
  color: var(--text-strong);
}
.count {
  flex-shrink: 0;
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--text-muted);
}
.filters {
  font-size: var(--text-small);
  color: var(--text-dim);
}
summary {
  cursor: pointer;
  padding-block: var(--space-1);
}
.filters .checkbox-field {
  display: flex;
  padding: var(--space-2) var(--space-1);
  overflow-wrap: anywhere;
}
.hint {
  margin: var(--space-2) 0;
  font-size: var(--text-caption);
  line-height: 1.5;
  color: var(--text-muted);
}
.empty {
  margin: var(--space-3);
}
.clear {
  justify-self: start;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: var(--text-caption);
}
h3 {
  margin: var(--space-3) 0 var(--space-1);
}
.group-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  text-align: start;
  color: var(--text-dim);
  font-size: var(--text-small);
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
