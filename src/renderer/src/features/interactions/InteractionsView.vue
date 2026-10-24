<script setup lang="ts">
import { computed } from 'vue'
import { isolate } from '../../shared/isolate'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { shade } from './interaction-matrix'
import { useInteractions } from './use-interactions'
import { uiDirection } from '../../../../i18n/locales'

const view = useInteractions()
const { interactions, error, order, matrix, picked } = view
const language = useUiLanguageStore()
const { formatNumber } = useChromePresentation()

const pair = computed(() => {
  const current = picked.value
  const m = matrix.value
  if (current === null || m === null) return null
  const row = m.characters[current.row]
  const column = m.characters[current.column]
  const cell = m.cells[current.row]?.[current.column]
  if (row === undefined || column === undefined || cell === undefined) return null
  return { row, column, cell, same: current.row === current.column }
})

function cellLabel(row: number, column: number): string {
  const m = matrix.value
  const a = m?.characters[row]?.name ?? ''
  const b = m?.characters[column]?.name ?? ''
  const count = m?.cells[row]?.[column]?.chapters.length ?? 0
  return row === column
    ? language.t('interactions-cell-self', isolate(a), count, formatNumber(count))
    : language.t('interactions-cell-pair', isolate(a), isolate(b), count, formatNumber(count))
}

function chapterTitle(index: number): string {
  return interactions.value?.chapters[index]?.title ?? ''
}

function chapterPath(index: number): string {
  return interactions.value?.chapters[index]?.path ?? ''
}
</script>

<template>
  <section
    class="interactions"
    :dir="uiDirection(language.locale)"
    aria-labelledby="interactions-heading"
  >
    <header>
      <h1 id="interactions-heading">{{ language.t('interactions-heading') }}</h1>
      <p class="hint">{{ language.t('interactions-description') }}</p>
      <div class="segmented" role="group" :aria-label="language.t('interactions-order-group')">
        <button type="button" :class="{ on: order === 'name' }" @click="order = 'name'">
          {{ language.t('interactions-order-name') }}
        </button>
        <button
          type="button"
          :class="{ on: order === 'appearances' }"
          @click="order = 'appearances'"
        >
          {{ language.t('interactions-order-appearances') }}
        </button>
      </div>
      <p v-if="interactions && interactions.outside > 0" class="hint">
        {{
          language.t(
            'interactions-outside-order',
            interactions.outside,
            formatNumber(interactions.outside)
          )
        }}
      </p>
    </header>

    <p v-if="error" class="notice error" role="alert" dir="auto">{{ error }}</p>
    <p v-if="matrix && matrix.characters.length === 0" class="empty">
      {{ language.t('interactions-empty') }}
    </p>

    <div v-else-if="matrix" class="scroll">
      <table>
        <thead>
          <tr>
            <th class="corner" aria-hidden="true"></th>
            <th v-for="character in matrix.characters" :key="character.path" scope="col">
              <bdi>{{ character.name }}</bdi>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in matrix.characters" :key="row.path">
            <th scope="row">
              <bdi>{{ row.name }}</bdi>
            </th>
            <td v-for="(cell, columnIndex) in matrix.cells[rowIndex]" :key="columnIndex">
              <button
                type="button"
                class="cell"
                :class="{
                  own: rowIndex === columnIndex,
                  picked: picked?.row === rowIndex && picked.column === columnIndex,
                  pov: rowIndex !== columnIndex && cell.povOfRow + cell.povOfColumn > 0
                }"
                :style="
                  rowIndex === columnIndex
                    ? undefined
                    : { '--strength': String(shade(cell.chapters.length, matrix.maxShared)) }
                "
                :title="cellLabel(rowIndex, columnIndex)"
                :aria-label="cellLabel(rowIndex, columnIndex)"
                @click="picked = { row: rowIndex, column: columnIndex }"
              >
                {{
                  cell.chapters.length === 0 && rowIndex !== columnIndex
                    ? ''
                    : formatNumber(cell.chapters.length)
                }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-if="pair" class="details" aria-live="polite">
      <h2 v-if="pair.same">
        {{
          language.t(
            'interactions-selected-self',
            isolate(pair.row.name),
            pair.cell.chapters.length,
            formatNumber(pair.cell.chapters.length)
          )
        }}
      </h2>
      <h2 v-else>
        {{
          language.t(
            'interactions-selected-pair',
            isolate(pair.row.name),
            isolate(pair.column.name),
            pair.cell.chapters.length,
            formatNumber(pair.cell.chapters.length)
          )
        }}
      </h2>
      <p v-if="pair.cell.chapters.length === 0" class="empty">
        {{
          language.t(
            'interactions-never-together',
            isolate(pair.row.name),
            isolate(pair.column.name)
          )
        }}
      </p>
      <ul v-else>
        <li v-for="index in pair.cell.chapters" :key="index">
          <button type="button" class="link" @click="view.open(chapterPath(index))">
            <bdi>{{ chapterTitle(index) }}</bdi>
          </button>
          <span v-if="pair.row.povChapters.includes(index)" class="muted">
            · {{ language.t('interactions-pov', isolate(pair.row.name)) }}
          </span>
          <span v-else-if="!pair.same && pair.column.povChapters.includes(index)" class="muted">
            · {{ language.t('interactions-pov', isolate(pair.column.name)) }}
          </span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.interactions {
  padding-bottom: calc(var(--space-8) + var(--space-7));
  font-size: var(--text-body);
}

h1 {
  margin: 0;
  font-family: var(--font-prose);
  font-size: var(--text-display);
  font-weight: 400;
  color: var(--text-strong);
}

.hint,
.muted {
  color: var(--text-muted);
}

.hint {
  margin: var(--space-3) 0 var(--space-5);
  max-width: 640px;
  line-height: 1.5;
}

.segmented {
  display: inline-flex;
  padding: var(--space-1);
  border-radius: var(--radius-field);
  background: var(--raised);
}

.segmented button {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-field);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-small);
}

.segmented button.on {
  background: var(--active);
  color: var(--text-strong);
}

.scroll {
  margin-top: var(--space-5);
  overflow-x: auto;
}

table {
  border-collapse: separate;
  border-spacing: 3px;
}

th {
  padding: var(--space-2) var(--space-3);
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
}

thead th {
  font-size: var(--text-small);
  text-align: center;
}

thead th.corner {
  position: sticky;
  inset-inline-start: 0;
  z-index: 2;
  background: var(--bg);
}

tbody th {
  position: sticky;
  inset-inline-start: 0;
  z-index: 1;
  background: var(--bg);
  text-align: start;
}

.cell {
  width: 52px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-field);
  background: color-mix(in srgb, var(--accent) calc(var(--strength, 0) * 70%), transparent);
  color: var(--text-strong);
  font: inherit;
  font-variant-numeric: tabular-nums;
}

.cell.own {
  border-style: dashed;
  background: transparent;
  color: var(--text-muted);
}

.cell.pov {
  border-color: var(--accent);
}

.cell.picked {
  outline: 2px solid var(--text-strong);
  outline-offset: 1px;
}

.details {
  margin-top: var(--space-6);
}

.details h2 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-title);
  font-weight: 500;
  color: var(--text-strong);
}

.details ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.details li {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--line);
}

.link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
