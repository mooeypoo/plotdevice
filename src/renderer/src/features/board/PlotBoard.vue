<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { BoardBeatDto } from '../../../../contract/dtos'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useOutlineStore } from '../../app/outline-store'
import { usePeek } from '../../app/peek-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkspaceStore } from '../../app/workspace-store'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { moveOnBoard, type BoardPosition } from './board-keys'
import { usePlotBoard } from './use-plot-board'

const outlines = useOutlineStore()
const manuscript = useManuscriptStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const navigation = useWorkbenchNavigation()
const chrome = useChromePresentation()
const peek = usePeek()
const plot = usePlotBoard()
const { board, columns, direction, threads, loading, error, path, linkNotice } = plot
const root = useTemplateRef<HTMLElement>('root')

const linkTargets = computed(() => manuscript.manuscript?.linkTargets ?? [])
const focused = ref<BoardPosition>({ column: 0, beat: 0 })
const isFocusable = (position: BoardPosition): boolean =>
  position.column === focused.value.column && position.beat === focused.value.beat

/** The first line of a beat's notes, as a quiet hint on its card. */
const firstNote = (beat: BoardBeatDto): string =>
  beat.notes
    .split('\n')
    .find((line) => line.trim() !== '')
    ?.replace(/^\s*[-*+]\s+/u, '') ?? ''

function facts(beat: BoardBeatDto): string {
  const chapter = beat.chapter
  if (chapter === undefined) return ''
  return [
    chapter.status,
    chapter.pov.length > 0 ? language.t('board-pov', chapter.pov.join(', ')) : undefined,
    language.t('board-words', chapter.wordCount, chrome.formatNumber(chapter.wordCount))
  ]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ')
}

function choose(event: Event): void {
  if (event.target instanceof HTMLSelectElement) outlines.choose(event.target.value)
}

async function keydown(
  event: KeyboardEvent,
  from: BoardPosition,
  beat: BoardBeatDto
): Promise<void> {
  // Keys inside the title's links belong to the links (Enter opens, Alt+Enter peeks).
  if (event.target !== event.currentTarget) return
  if (event.key === 'Enter' && beat.chapter !== undefined) {
    event.preventDefault()
    await plot.writeChapter(beat.chapter.path)
    return
  }
  const to = moveOnBoard(
    from,
    event.key,
    direction.value,
    columns.value.map((shown) => shown.beats.length)
  )
  if (to === undefined) return
  event.preventDefault()
  focused.value = to
  await nextTick()
  root.value
    ?.querySelector<HTMLElement>(`[data-position="${String(to.column)}-${String(to.beat)}"]`)
    ?.focus()
}
</script>

<template>
  <section ref="root" class="board" :aria-label="language.t('board-label')">
    <header>
      <select
        v-if="outlines.outlines.length > 1"
        class="choose"
        dir="auto"
        :value="path ?? ''"
        :aria-label="language.t('outline-panel-select-label')"
        @change="choose"
      >
        <option v-for="outline in outlines.outlines" :key="outline.path" :value="outline.path">
          {{ outline.title }}
        </option>
      </select>
      <h2 v-else-if="outlines.outlines.length === 1" class="title" dir="auto">
        {{ outlines.outlines[0]?.title }}
      </h2>
      <p v-if="linkNotice" class="muted" role="status">{{ linkNotice }}</p>
    </header>

    <div v-if="outlines.outlines.length === 0" class="empty">
      <p>{{ language.t('board-no-outline') }}</p>
      <button
        v-if="!(workspace.project?.readOnly ?? false)"
        type="button"
        class="primary"
        @click="outlines.create('')"
      >
        {{ language.t('outline-panel-start') }}
      </button>
    </div>
    <p v-else-if="error" class="empty error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="empty" role="status">{{ language.t('board-loading') }}</p>
    <template v-else-if="board">
      <RenderedMarkdown
        v-if="board.preamble !== ''"
        class="preamble"
        :text="board.preamble"
        :link-targets="linkTargets"
        @open-link="(link) => plot.openLink(link, path ?? undefined)"
        @peek="(link, near, byKeyboard) => peek.peekLink(link, path ?? undefined, near, byKeyboard)"
        @peek-end="peek.endHover()"
      />
      <div v-if="columns.length === 0" class="empty">
        <p>{{ language.t('board-no-columns') }}</p>
        <button type="button" @click="navigation.showOutlineText()">
          {{ language.t('board-edit-text') }}
        </button>
      </div>
      <ol v-else class="columns" :dir="direction">
        <li
          v-for="(shown, columnIndex) in columns"
          :key="shown.column.line"
          class="column"
          :class="{ inbox: shown.column.inbox }"
        >
          <h3 class="column-title" dir="auto">
            <span>{{ shown.column.title }}</span>
            <span class="count">{{ chrome.formatNumber(shown.beats.length) }}</span>
          </h3>
          <ol class="beats">
            <li v-for="(beat, beatIndex) in shown.beats" :key="beat.line">
              <article
                class="beat"
                :data-position="`${columnIndex}-${beatIndex}`"
                :tabindex="isFocusable({ column: columnIndex, beat: beatIndex }) ? 0 : -1"
                @focus="focused = { column: columnIndex, beat: beatIndex }"
                @keydown="keydown($event, { column: columnIndex, beat: beatIndex }, beat)"
              >
                <ul v-if="beat.threads.length > 0" class="threads">
                  <li
                    v-for="key in beat.threads"
                    :key="key"
                    class="thread"
                    :style="{ '--thread-color': threads.get(key)?.color ?? 'var(--line-strong)' }"
                    dir="auto"
                  >
                    {{ threads.get(key)?.name ?? key }}
                  </li>
                </ul>
                <RenderedMarkdown
                  class="beat-title"
                  :text="beat.title"
                  :link-targets="linkTargets"
                  @open-link="(link) => plot.openLink(link, path ?? undefined)"
                  @peek="
                    (link, near, byKeyboard) =>
                      peek.peekLink(link, path ?? undefined, near, byKeyboard)
                  "
                  @peek-end="peek.endHover()"
                />
                <p v-if="beat.chapter" class="facts" dir="auto">{{ facts(beat) }}</p>
                <p v-if="firstNote(beat) !== ''" class="notes" dir="auto">{{ firstNote(beat) }}</p>
              </article>
            </li>
          </ol>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding-block: 16px;
  padding-inline: 20px;
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-strong);
}

.choose {
  max-width: 24em;
  padding-block: 4px;
  padding-inline: 8px;
}

.preamble {
  max-width: var(--measure);
  color: var(--text-dim);
}

.columns {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 14px;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.column {
  display: flex;
  flex: 0 0 260px;
  flex-direction: column;
  gap: 8px;
  max-height: 100%;
  padding: 10px;
  border-radius: 10px;
  background: var(--raised);
}

.column.inbox {
  border: 1px dashed var(--line-strong);
  background: transparent;
}

.column-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong);
}

.count {
  color: var(--text-muted);
  font-weight: 400;
}

.beats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.beat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-block: 8px;
  padding-inline: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  font-size: 13px;
}

.beat:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.beat-title :deep(p) {
  margin: 0;
}

.threads {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.thread {
  padding-inline: 6px 6px;
  border-inline-start: 3px solid var(--thread-color);
  color: var(--text-muted);
  font-size: 11px;
}

.facts,
.notes {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.notes {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  max-width: var(--measure);
  margin: 0;
  color: var(--text-muted);
}

.error {
  color: var(--danger);
}

.muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
