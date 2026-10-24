<script setup lang="ts">
import { computed } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { formatWordCount, statusColor } from '../../shared/manuscript-labels'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { romanNumeral } from '../../shared/roman-numeral'
import SelectField from '../../shared/SelectField.vue'
import type { SelectOption } from '../../shared/select-option'
import SynopsisCell from './SynopsisCell.vue'
import type { OverviewSectionLabel } from './overview-sections'
import { useOverview } from './use-overview'

const workspace = useWorkspaceStore()
const overview = useOverview()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const { filters, sections, choices, filtering } = overview
const readOnly = computed(() => workspace.project?.readOnly ?? false)
const shown = computed(() =>
  sections.value.filter((section) => section.chapters.length > 0 || !filtering.value)
)

function setFilter(key: 'status' | 'pov' | 'thread', value: string): void {
  filters.value = { ...filters.value, [key]: value === '*' ? null : value }
}

const statusChoices = computed((): SelectOption[] => [
  { value: '*', label: language.t('overview-any') },
  ...choices.value.statuses.map((status) => ({ value: status, label: status })),
  { value: '', label: language.t('binder-no-status') }
])
const povChoices = computed((): SelectOption[] => [
  { value: '*', label: language.t('overview-anyone') },
  ...choices.value.povs.map((pov) => ({ value: pov, label: pov }))
])
const threadChoices = computed((): SelectOption[] => [
  { value: '*', label: language.t('overview-any') },
  ...choices.value.threads.map((thread) => ({
    value: thread,
    label: overview.threadLabel(thread).name
  }))
])

function sectionLabel(label: OverviewSectionLabel): string {
  switch (label.kind) {
    case 'part':
      return language.t('entry-place-part', romanNumeral(label.number))
    case 'not-in-sequence':
      return language.t('binder-not-in-sequence')
    case 'chapters':
      return language.t('overview-section-chapters')
    case 'unordered':
      return language.t('binder-unordered')
  }
}
</script>

<template>
  <section class="overview" aria-labelledby="overview-heading">
    <header>
      <h1 id="overview-heading">{{ language.t('overview-heading') }}</h1>
      <p class="hint">{{ language.t('overview-description') }}</p>
      <div class="filters" role="group" :aria-label="language.t('overview-filters')">
        <label>
          {{ language.t('overview-status') }}
          <SelectField
            :model-value="filters.status ?? '*'"
            :options="statusChoices"
            size="small"
            @update:model-value="setFilter('status', $event)"
          />
        </label>
        <label>
          {{ language.t('overview-pov') }}
          <SelectField
            :model-value="filters.pov ?? '*'"
            :options="povChoices"
            size="small"
            @update:model-value="setFilter('pov', $event)"
          />
        </label>
        <label>
          {{ language.t('overview-thread') }}
          <SelectField
            :model-value="filters.thread ?? '*'"
            :options="threadChoices"
            size="small"
            @update:model-value="setFilter('thread', $event)"
          />
        </label>
        <button v-if="filtering" type="button" class="quiet small" @click="overview.clear()">
          {{ language.t('overview-clear-filters') }}
        </button>
      </div>
    </header>

    <p v-if="shown.length === 0" class="empty">{{ language.t('overview-no-match') }}</p>

    <section v-for="section in shown" :key="section.key" class="section">
      <h2>
        <span class="label">{{ sectionLabel(section.label) }}</span>
        <span v-if="section.part" class="part-title" dir="auto">{{ section.part.title }}</span>
        <span class="count">
          {{
            filtering
              ? language.t(
                  'overview-filtered-count',
                  section.chapters.length,
                  chrome.formatNumber(section.chapters.length),
                  section.total,
                  chrome.formatNumber(section.total)
                )
              : formatWordCount(section.wordCount, chrome.formatNumber)
          }}
        </span>
      </h2>
      <p v-if="section.part?.synopsis" class="part-synopsis" dir="auto">
        {{ section.part.synopsis }}
      </p>
      <table>
        <tbody>
          <tr v-for="chapter in section.chapters" :key="chapter.path">
            <td class="number">{{ chapter.number ?? '' }}</td>
            <td class="title">
              <button type="button" class="open" dir="auto" @click="overview.open(chapter.path)">
                {{ chapter.title }}
              </button>
              <div class="meta">
                <span class="status">
                  <span
                    class="dot"
                    :style="{ background: statusColor(chapter.status) }"
                    aria-hidden="true"
                  ></span>
                  {{ chapter.status ?? language.t('binder-no-status') }}
                </span>
                <span v-if="chapter.pov.length > 0" dir="auto">· {{ chapter.pov.join(', ') }}</span>
                <span
                  v-for="thread in chapter.threads"
                  :key="thread"
                  class="thread"
                  :style="{ borderColor: overview.threadLabel(thread).color }"
                >
                  {{ overview.threadLabel(thread).name }}
                </span>
              </div>
            </td>
            <td class="synopsis">
              <SynopsisCell
                :synopsis="chapter.synopsis"
                :read-only="readOnly"
                :title="chapter.title"
                @save="overview.saveSynopsis(chapter.path, $event)"
              />
            </td>
            <td class="words">{{ formatWordCount(chapter.wordCount, chrome.formatNumber) }}</td>
          </tr>
          <tr v-if="section.chapters.length === 0">
            <td colspan="4" class="empty">{{ language.t('overview-no-chapters') }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<style scoped>
.overview {
  max-width: 980px;
  margin: 0 auto;
  padding-bottom: calc(var(--space-8) + var(--space-7));
  font-size: var(--text-title);
}

h1 {
  margin: 0;
  font-family: var(--font-prose);
  font-size: var(--text-display);
  font-weight: 400;
  color: var(--text-strong);
}

.hint {
  margin: var(--space-3) 0 var(--space-5);
  color: var(--text-muted);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-small);
  color: var(--text-muted);
}

.filters .select-field {
  min-inline-size: 140px;
}

.section {
  margin-bottom: var(--space-6);
}

h2 {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin: 0 0 var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line-strong);
  font-size: var(--text-body);
  font-weight: 500;
}

.label {
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.part-title {
  flex: 1;
  color: var(--text-strong);
}

.count {
  font-size: var(--text-small);
  font-weight: 400;
  color: var(--text-muted);
}

.part-synopsis {
  margin: 0 0 var(--space-3);
  color: var(--text-dim);
}

table {
  width: 100%;
  border-collapse: collapse;
}

td {
  padding: var(--space-3) var(--space-3);
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}

.number {
  width: 28px;
  text-align: end;
  color: var(--text-muted);
}

.title {
  width: 32%;
}

.open {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-strong);
  font: inherit;
  font-weight: 500;
  text-align: start;
}

.open:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
  font-size: var(--text-small);
  color: var(--text-muted);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.thread {
  padding: 0 var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
}

.words {
  width: 60px;
  text-align: end;
  color: var(--text-muted);
}
</style>
