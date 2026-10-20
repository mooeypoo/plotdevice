<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspaceStore } from '../../app/workspace-store'
import { formatWordCount, statusColor } from '../binder/binder-labels'
import SynopsisCell from './SynopsisCell.vue'
import { useOverview } from './use-overview'

const workspace = useWorkspaceStore()
const overview = useOverview()
const { filters, sections, choices, filtering } = overview
const readOnly = computed(() => workspace.project?.readOnly ?? false)
const shown = computed(() =>
  sections.value.filter((section) => section.chapters.length > 0 || !filtering.value)
)

function setFilter(key: 'status' | 'pov' | 'thread', event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  filters.value = { ...filters.value, [key]: value === '*' ? null : value }
}
</script>

<template>
  <section class="overview" aria-labelledby="overview-heading">
    <header>
      <h1 id="overview-heading">Overview</h1>
      <p class="hint">Every chapter as the files say it is. Click a synopsis to edit it.</p>
      <div class="filters" role="group" aria-label="Filters">
        <label>
          Status
          <select :value="filters.status ?? '*'" @change="setFilter('status', $event)">
            <option value="*">Any</option>
            <option v-for="status in choices.statuses" :key="status" :value="status">
              {{ status }}
            </option>
            <option value="">No status</option>
          </select>
        </label>
        <label>
          Point of view
          <select :value="filters.pov ?? '*'" dir="auto" @change="setFilter('pov', $event)">
            <option value="*">Anyone</option>
            <option v-for="pov in choices.povs" :key="pov" :value="pov">{{ pov }}</option>
          </select>
        </label>
        <label>
          Thread
          <select :value="filters.thread ?? '*'" @change="setFilter('thread', $event)">
            <option value="*">Any</option>
            <option v-for="thread in choices.threads" :key="thread" :value="thread">
              {{ overview.threadLabel(thread).name }}
            </option>
          </select>
        </label>
        <button v-if="filtering" type="button" class="quiet small" @click="overview.clear()">
          Clear filters
        </button>
      </div>
    </header>

    <p v-if="shown.length === 0" class="empty">No chapters match these filters.</p>

    <section v-for="section in shown" :key="section.key" class="section">
      <h2>
        <span class="label">{{ section.label }}</span>
        <span v-if="section.part" class="part-title" dir="auto">{{ section.part.title }}</span>
        <span class="count">
          {{
            filtering
              ? `${section.chapters.length} of ${section.total}`
              : formatWordCount(section.wordCount)
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
                  {{ chapter.status ?? 'no status' }}
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
            <td class="words">{{ formatWordCount(chapter.wordCount) }}</td>
          </tr>
          <tr v-if="section.chapters.length === 0">
            <td colspan="4" class="empty">No chapters yet.</td>
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
  padding-bottom: 80px;
  font-size: 14px;
}

h1 {
  margin: 0;
  font-family: var(--font-prose);
  font-size: 32px;
  font-weight: 400;
  color: var(--text-strong);
}

.hint {
  margin: 6px 0 18px;
  color: var(--text-muted);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 24px;
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.filters select {
  min-width: 140px;
  padding: 5px 8px;
}

.small {
  padding: 5px 10px;
  font-size: 12px;
}

.section {
  margin-bottom: 28px;
}

h2 {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line-strong);
  font-size: 13px;
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
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}

.part-synopsis {
  margin: 0 0 8px;
  color: var(--text-dim);
}

table {
  width: 100%;
  border-collapse: collapse;
}

td {
  padding: 8px 6px;
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
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.thread {
  padding: 0 6px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
}

.words {
  width: 60px;
  text-align: end;
  color: var(--text-muted);
}

.empty {
  color: var(--text-muted);
}
</style>
