<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TimelineChapterDto } from '../../../../contract/dtos'
import { isolate } from '../../shared/isolate'
import { chapterLabel } from './reading-grid'
import { axisTicks, PX_PER_DAY, type Zoom } from './story-axis'
import { useTimeline } from './use-timeline'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { formatStoryDateReading } from '../../shared/story-date-format'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import type { Cell, GridRow } from './reading-grid'
import { uiDirection } from '../../../../i18n/locales'

const view = useTimeline()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const { timeline, error, order, rows, minGap, zoom, grid, backInTime, story, range, undated } = view

const host = ref<HTMLElement | null>(null)
const LANE = 26
const ZOOMS: readonly Zoom[] = ['day', 'week', 'month', 'year']

onMounted(() => {
  view.fitZoom((host.value?.clientWidth ?? 1000) - 200)
})

const pxPerDay = computed(() => PX_PER_DAY[zoom.value ?? 'month'])
const axisWidth = computed(() =>
  // Room after the last day for the title of a bar too narrow to hold it.
  range.value === undefined ? 0 : (range.value.end - range.value.start + 1) * pxPerDay.value + 180
)
const ticks = computed(() =>
  range.value === undefined || timeline.value === null
    ? []
    : axisTicks(
        timeline.value.calendar,
        range.value.start,
        range.value.end,
        pxPerDay.value,
        language.t,
        chrome.formatNumber
      )
)
const x = (day: number): number => (day - (range.value?.start ?? 0)) * pxPerDay.value

function describe(chapter: TimelineChapterDto): string {
  const date =
    chapter.date.kind === 'dated'
      ? formatStoryDateReading(chapter.date.reading, language.t)
      : chapter.date.kind === 'invalid'
        ? language.t('date-unreadable')
        : language.t('date-undated')
  const time = chapter.storyTime === undefined ? '' : `, ${isolate(chapter.storyTime)}`
  const synopsis = chapter.synopsis === undefined ? '' : `\n${isolate(chapter.synopsis)}`
  return `${isolate(chapter.title)} · ${date}${time}${synopsis}`
}

const chapterAt = (path: string): TimelineChapterDto | undefined =>
  timeline.value?.chapters.find((chapter) => chapter.path === path)

function cellLabel(row: GridRow, chapter: TimelineChapterDto, cell: Cell): string {
  const state =
    cell === 'out'
      ? language.t('timeline-cell-no')
      : cell === 'pov'
        ? language.t('timeline-cell-pov')
        : language.t('timeline-cell-yes')
  return language.t('timeline-cell-label', isolate(row.name), isolate(chapter.title), state)
}

function gapCount(row: GridRow): number {
  return Math.max(...row.gaps.map((gap) => gap.to - gap.from + 1))
}

function setMinGap(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isInteger(value) && value >= 1) minGap.value = value
}
</script>

<template>
  <section
    ref="host"
    class="timeline"
    :dir="uiDirection(language.locale)"
    aria-labelledby="timeline-heading"
  >
    <header>
      <h1 id="timeline-heading">{{ language.t('timeline-heading') }}</h1>
      <div class="controls">
        <div class="segmented" role="group" :aria-label="language.t('timeline-order-group')">
          <button type="button" :class="{ on: order === 'reading' }" @click="order = 'reading'">
            {{ language.t('timeline-reading-order') }}
          </button>
          <button type="button" :class="{ on: order === 'story' }" @click="order = 'story'">
            {{ language.t('timeline-story-order') }}
          </button>
        </div>
        <div class="segmented" role="group" :aria-label="language.t('timeline-rows-group')">
          <button type="button" :class="{ on: rows === 'threads' }" @click="rows = 'threads'">
            {{ language.t('timeline-threads') }}
          </button>
          <button type="button" :class="{ on: rows === 'characters' }" @click="rows = 'characters'">
            {{ language.t('timeline-characters') }}
          </button>
        </div>
        <label v-if="order === 'reading'" class="gap-setting">
          {{ language.t('timeline-gap-prefix') }}
          <input
            type="number"
            min="1"
            :value="minGap"
            :aria-label="language.t('timeline-gap-input-label', chrome.formatNumber(minGap))"
            @change="setMinGap"
          />
          {{ language.t('timeline-gap-suffix') }}
        </label>
        <div
          v-else
          class="segmented"
          role="group"
          :aria-label="language.t('timeline-zoom-group')"
        >
          <button
            v-for="level in ZOOMS"
            :key="level"
            type="button"
            :class="{ on: zoom === level }"
            @click="zoom = level"
          >
            {{ language.t(`timeline-zoom-${level}`) }}
          </button>
        </div>
      </div>
      <p v-if="timeline && timeline.outside > 0" class="hint">
        {{
          language.t(
            'timeline-outside-order',
            timeline.outside,
            chrome.formatNumber(timeline.outside)
          )
        }}
      </p>
    </header>

    <p v-if="error" class="hint query-error" role="alert" dir="auto">{{ error }}</p>
    <p v-if="timeline && timeline.chapters.length === 0" class="empty">
      {{ language.t('timeline-no-chapters') }}
    </p>
    <p v-else-if="timeline && grid.length === 0" class="empty">
      {{
        rows === 'threads'
          ? language.t('timeline-no-threads')
          : language.t('timeline-no-characters')
      }}
    </p>

    <!-- Reading order: a column per chapter, as the book runs. -->
    <div
      v-else-if="timeline && order === 'reading'"
      class="grid"
      :style="{
        gridTemplateColumns: `180px repeat(${timeline.chapters.length}, minmax(92px, 1fr))`
      }"
      role="table"
      :aria-label="language.t('timeline-reading-grid')"
    >
      <div class="corner" role="columnheader"></div>
      <div
        v-for="(chapter, index) in timeline.chapters"
        :key="chapter.path"
        class="column-head"
        role="columnheader"
      >
        <button
          type="button"
          class="chapter"
          dir="auto"
          :title="describe(chapter)"
          @click="view.open(chapter.path)"
        >
          <span class="label" dir="ltr">{{ chapterLabel(chapter, chrome.formatNumber) }}</span>
          {{ chapter.title }}
        </button>
        <span class="date" :class="{ missing: chapter.date.kind !== 'dated' }">
          {{
            chapter.date.kind === 'dated'
              ? formatStoryDateReading(chapter.date.reading, language.t)
              : chapter.date.kind === 'invalid'
                ? language.t('date-invalid-short')
                : language.t('date-undated-short')
          }}
        </span>
        <span
          v-if="backInTime[index]"
          class="back"
          :title="language.t('timeline-earlier-title')"
        >
          ↶ {{ language.t('timeline-earlier') }}
        </span>
      </div>

      <template v-for="row in grid" :key="row.key">
        <div class="row-name" role="rowheader">
          <span class="swatch" :style="{ background: row.color ?? 'var(--accent)' }"></span>
          <span dir="auto">{{ row.name }}</span>
          <span v-if="row.gaps.length > 0" class="gap-note">
            {{
              language.t(
                'timeline-gap-count',
                Math.max(...row.gaps.map((gap) => gap.to - gap.from + 1)),
                chrome.formatNumber(gapCount(row))
              )
            }}
          </span>
        </div>
        <button
          v-for="(cell, index) in row.cells"
          :key="index"
          type="button"
          class="cell"
          :class="[cell, { gap: row.gaps.some((gap) => index >= gap.from && index <= gap.to) }]"
          :style="cell === 'out' ? undefined : { '--row-color': row.color ?? 'var(--accent)' }"
          :title="describe(timeline.chapters[index] as TimelineChapterDto)"
          :aria-label="cellLabel(row, timeline.chapters[index] as TimelineChapterDto, cell)"
          @click="view.open(timeline.chapters[index]?.path ?? '')"
        ></button>
      </template>
    </div>

    <!-- Story order: when things happen, on a real time scale. -->
    <div v-else-if="timeline && order === 'story'" class="story">
      <p v-if="range === undefined" class="empty">
        {{ language.t('timeline-no-story-dates') }}
      </p>
      <div v-else class="story-body">
        <div class="names">
          <div class="axis-spacer"></div>
          <div
            v-for="row in story"
            :key="row.key"
            class="row-name"
            :style="{ height: `${row.lanes * LANE + 10}px` }"
          >
            <span class="swatch" :style="{ background: row.color ?? 'var(--accent)' }"></span>
            <span dir="auto">{{ row.name }}</span>
          </div>
        </div>
        <div class="track">
          <div class="axis" :style="{ width: `${axisWidth}px` }">
            <span
              v-for="tick in ticks"
              :key="tick.day"
              class="tick"
              :class="{ major: tick.major }"
              :style="{ insetInlineStart: `${x(tick.day)}px` }"
            >
              {{ tick.label }}
            </span>
          </div>
          <div
            v-for="row in story"
            :key="row.key"
            class="lane-row"
            :style="{ width: `${axisWidth}px`, height: `${row.lanes * LANE + 10}px` }"
          >
            <button
              v-for="bar in row.bars"
              :key="bar.path"
              type="button"
              class="bar"
              :class="{
                vague: bar.precision !== 'day',
                pov: bar.pov,
                narrow: (bar.end - bar.start + 1) * pxPerDay < 64
              }"
              :dir="uiDirection(language.locale)"
              :style="{
                insetInlineStart: `${x(bar.start)}px`,
                width: `${Math.max((bar.end - bar.start + 1) * pxPerDay, 8)}px`,
                top: `${bar.lane * LANE + 5}px`,
                '--row-color': row.color ?? 'var(--accent)'
              }"
              :title="describe(chapterAt(bar.path) as TimelineChapterDto)"
              @click="view.open(bar.path)"
            >
              <span class="name"><bdi>{{ bar.title }}</bdi></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <section v-if="undated.length > 0" class="undated" aria-labelledby="undated-heading">
      <h2 id="undated-heading" class="eyebrow">{{ language.t('date-without-usable') }}</h2>
      <ul>
        <li v-for="chapter in undated" :key="chapter.path">
          <button type="button" class="link" dir="auto" @click="view.fixDate(chapter.path)">
            <span dir="ltr">{{ chapterLabel(chapter, chrome.formatNumber) }}</span>
            {{ chapter.title }}
          </button>
          <span class="muted">
            {{
              chapter.date.kind === 'invalid'
                ? formatStoryDateReading(chapter.date, language.t)
                : language.t('date-missing')
            }}
          </span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.timeline {
  max-width: 100%;
  padding-bottom: 80px;
  font-size: 13px;
}

h1 {
  margin: 0 0 14px;
  font-family: var(--font-prose);
  font-size: 32px;
  font-weight: 400;
  color: var(--text-strong);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.segmented {
  display: flex;
  padding: 2px;
  border-radius: 8px;
  background: var(--raised);
}

.segmented button {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
}

.segmented button.on {
  background: var(--active);
  color: var(--text-strong);
}

.gap-setting {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.gap-setting input {
  width: 52px;
  padding: 3px 6px;
}

.hint,
.empty,
.muted {
  color: var(--text-muted);
}

.hint {
  margin: 10px 0 0;
}

.query-error {
  color: var(--danger);
  overflow-wrap: anywhere;
}

.grid {
  display: grid;
  margin-top: 18px;
  overflow-x: auto;
}

.corner,
.row-name {
  position: sticky;
  inset-inline-start: 0;
  z-index: 1;
  background: var(--bg);
}

.column-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 6px 8px;
  border-bottom: 1px solid var(--line-strong);
}

.chapter {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-strong);
  font: inherit;
  font-weight: 500;
  text-align: start;
}

.label {
  margin-inline-end: 4px;
  color: var(--text-muted);
  font-weight: 400;
}

.date {
  font-size: 11px;
  color: var(--text-dim);
}

.date.missing {
  color: var(--text-muted);
  font-style: italic;
}

.back {
  font-size: 11px;
  color: var(--warning);
}

.row-name {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 4px;
  border-bottom: 1px solid var(--line);
  color: var(--text);
}

.swatch {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.gap-note {
  margin-inline-start: auto;
  font-size: 11px;
  color: var(--warning);
  white-space: nowrap;
}

.cell {
  height: 34px;
  margin: 0;
  padding: 0;
  border: none;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
}

.cell.in::after,
.cell.pov::after {
  display: block;
  height: 12px;
  margin: 0 3px;
  border-radius: 4px;
  background: var(--row-color);
  opacity: 0.55;
  content: '';
}

.cell.pov::after {
  height: 18px;
  opacity: 1;
}

.cell.gap {
  background: repeating-linear-gradient(
    135deg,
    transparent 0 6px,
    rgba(216, 178, 110, 0.12) 6px 12px
  );
}

.story-body {
  display: flex;
  margin-top: 18px;
}

.names {
  flex-shrink: 0;
  width: 180px;
}

.axis-spacer {
  height: 30px;
}

.story .row-name {
  position: static;
}

.track {
  flex: 1;
  overflow-x: auto;
}

.axis {
  position: relative;
  height: 30px;
  border-bottom: 1px solid var(--line-strong);
}

.tick {
  position: absolute;
  bottom: 4px;
  padding-inline-start: 4px;
  border-inline-start: 1px solid var(--line);
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.tick.major {
  border-inline-start-color: var(--line-strong);
  color: var(--text);
}

.lane-row {
  position: relative;
  border-bottom: 1px solid var(--line);
}

.bar {
  position: absolute;
  height: 20px;
  overflow: hidden;
  padding: 0 6px;
  border: 1px solid var(--row-color);
  border-radius: 5px;
  background: color-mix(in srgb, var(--row-color) 45%, transparent);
  color: var(--text-strong);
  font-size: 11px;
  line-height: 18px;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar.vague {
  border-style: dashed;
  background: color-mix(in srgb, var(--row-color) 18%, transparent);
}

/* Too narrow for its title: the title follows the bar instead. */
.bar.narrow {
  overflow: visible;
  padding: 0;
}

.bar.narrow .name {
  position: absolute;
  inset-inline-start: calc(100% + 4px);
  color: var(--text);
}

.bar.pov {
  border-width: 2px;
}

.undated {
  margin-top: 28px;
}

.undated ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.undated li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 0;
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
