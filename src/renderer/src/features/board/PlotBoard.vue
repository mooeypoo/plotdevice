<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { BoardBeatDto, BoardColumnDto } from '../../../../contract/dtos'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useOutlineStore } from '../../app/outline-store'
import { usePeek } from '../../app/peek-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkspaceStore } from '../../app/workspace-store'
import MenuButton from '../../shared/MenuButton.vue'
import type { MenuItem } from '../../shared/menu-item'
import { isolate } from '../../shared/isolate'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { moveOnBoard, type BoardPosition } from './board-keys'
import {
  beatDrop,
  beatKeyMove,
  columnDrop,
  columnKeyMove,
  type BeatMove,
  type ColumnMove
} from './board-moves'
import BeatCard from './BeatCard.vue'
import { useBeatEditing } from './use-beat-editing'
import { gapAt, useBoardDrag, type BoardDragged, type BoardDropSpot } from './use-board-drag'
import { useInspectorStore } from '../../app/inspector-store'
import { usePlotBoard } from './use-plot-board'

const outlines = useOutlineStore()
const manuscript = useManuscriptStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const navigation = useWorkbenchNavigation()
const chrome = useChromePresentation()
const peek = usePeek()
const plot = usePlotBoard()
const { board, columns, direction, threads, loading, error, path, linkNotice, readOnly } = plot
const root = useTemplateRef<HTMLElement>('root')

const linkTargets = computed(() => manuscript.manuscript?.linkTargets ?? [])
/** The columns as shown (Inbox last), and as the file has them. */
const shown = computed((): readonly BoardColumnDto[] => columns.value.map((c) => c.column))
const inFile = computed((): readonly BoardColumnDto[] => board.value?.columns ?? [])
const focused = ref<BoardPosition>({ column: 0, beat: 0 })
const isFocusable = (position: BoardPosition): boolean =>
  position.column === focused.value.column && position.beat === focused.value.beat

function choose(event: Event): void {
  if (event.target instanceof HTMLSelectElement) outlines.choose(event.target.value)
}

async function focusCard(position: BoardPosition): Promise<void> {
  focused.value = position
  await nextTick()
  root.value
    ?.querySelector<HTMLElement>(
      `[data-position="${String(position.column)}-${String(position.beat)}"]`
    )
    ?.focus()
}

async function focusColumn(index: number): Promise<void> {
  await nextTick()
  root.value?.querySelector<HTMLElement>(`[data-column="${String(index)}"]`)?.focus()
}

const columnTitle = (ref: { readonly title: string }): string => isolate(ref.title)

async function runBeatMove(move: BeatMove, to: BoardPosition): Promise<void> {
  const done = language.t('board-moved-beat', isolate(move.beat.title), columnTitle(move.column))
  if (await plot.moveBeat(move, done)) await focusCard(to)
}

async function runColumnMove(move: ColumnMove, to: number): Promise<void> {
  if (await plot.moveColumn(move, language.t('board-moved-column', columnTitle(move.column)))) {
    await focusColumn(to)
  }
}

const editing = useBeatEditing(plot, focusCard)
const statuses = computed(() => useInspectorStore().vocabulary?.statuses ?? [])
const newCard = ref('')
const addInput = useTemplateRef<HTMLInputElement[]>('addInput')

async function openAdding(column: number): Promise<void> {
  newCard.value = ''
  editing.openAdding(column)
  await nextTick()
  addInput.value?.[0]?.focus()
}

async function addCard(column: BoardColumnDto): Promise<void> {
  if (await editing.addCard(column, newCard.value)) {
    newCard.value = ''
    await nextTick()
    addInput.value?.[0]?.focus()
  }
}

async function closeAdding(column: number): Promise<void> {
  editing.adding.value = null
  newCard.value = ''
  await nextTick()
  root.value?.querySelector<HTMLElement>(`[data-column="${String(column)}"]`)?.focus()
}

async function keydown(
  event: KeyboardEvent,
  from: BoardPosition,
  beat: BoardBeatDto
): Promise<void> {
  // Keys inside the title's links belong to the links (Enter opens, Alt+Enter peeks).
  if (event.target !== event.currentTarget) return
  if (event.key === 'F2' && !readOnly.value) {
    event.preventDefault()
    editing.start(from, 'title')
    return
  }
  if (event.key === 'Enter' && beat.chapter !== undefined) {
    event.preventDefault()
    await plot.writeChapter(beat.chapter.path)
    return
  }
  if (event.altKey) {
    const moved = readOnly.value
      ? undefined
      : beatKeyMove(shown.value, from, event.key, direction.value)
    if (moved === undefined) return
    event.preventDefault()
    await runBeatMove(moved.move, moved.to)
    return
  }
  const to = moveOnBoard(
    from,
    event.key,
    direction.value,
    columns.value.map((column) => column.beats.length)
  )
  if (to === undefined) return
  event.preventDefault()
  await focusCard(to)
}

async function columnKeydown(event: KeyboardEvent, index: number): Promise<void> {
  if (!event.altKey || readOnly.value || shown.value[index]?.inbox === true) return
  const moved = columnKeyMove(inFile.value, index, event.key, direction.value)
  if (moved === undefined) return
  event.preventDefault()
  await runColumnMove(moved.move, moved.to)
}

function cardMenu(from: BoardPosition, beat: BoardBeatDto): readonly MenuItem[] {
  if (readOnly.value) return []
  const edit = (key: 'title' | 'notes' | 'synopsis' | 'status', label: string): MenuItem => ({
    key: `edit-${key}`,
    label,
    run: () => {
      editing.start(from, key)
    }
  })
  const items: MenuItem[] = [
    edit('title', language.t('board-rename')),
    edit('notes', language.t('board-edit-notes')),
    ...(beat.chapter === undefined
      ? []
      : [
          edit('synopsis', language.t('board-edit-synopsis')),
          edit('status', language.t('board-edit-status'))
        ])
  ]
  const up = beatKeyMove(shown.value, from, 'ArrowUp', 'ltr')
  const down = beatKeyMove(shown.value, from, 'ArrowDown', 'ltr')
  if (up !== undefined) {
    items.push({
      key: 'up',
      label: language.t('board-move-up'),
      run: () => void runBeatMove(up.move, up.to)
    })
  }
  if (down !== undefined) {
    items.push({
      key: 'down',
      label: language.t('board-move-down'),
      run: () => void runBeatMove(down.move, down.to)
    })
  }
  shown.value.forEach((column, index) => {
    if (index === from.column) return
    const move = beatDrop(shown.value, from, index, column.beats.length)
    if (move === undefined) return
    items.push({
      key: `to-${String(column.line)}`,
      label: language.t('board-move-to', isolate(column.title)),
      run: () => void runBeatMove(move, { column: index, beat: column.beats.length })
    })
  })
  return items
}

function columnMenu(index: number): readonly MenuItem[] {
  if (readOnly.value) return []
  const add: MenuItem = {
    key: 'add',
    label: language.t('board-add-card'),
    run: () => void openAdding(index)
  }
  if (shown.value[index]?.inbox === true) return [add]
  const earlier = columnKeyMove(inFile.value, index, 'ArrowLeft', 'ltr')
  const later = columnKeyMove(inFile.value, index, 'ArrowRight', 'ltr')
  return [
    add,
    ...(earlier === undefined
      ? []
      : [
          {
            key: 'earlier',
            label: language.t('board-move-earlier'),
            run: () => void runColumnMove(earlier.move, earlier.to)
          }
        ]),
    ...(later === undefined
      ? []
      : [
          {
            key: 'later',
            label: language.t('board-move-later'),
            run: () => void runColumnMove(later.move, later.to)
          }
        ])
  ]
}

const movableCount = computed(() => shown.value.filter((column) => !column.inbox).length)

const drag = useBoardDrag((item: BoardDragged, spot: BoardDropSpot) => {
  if (item.kind === 'beat' && spot.kind === 'beat') {
    const move = beatDrop(shown.value, item.from, spot.column, spot.slot)
    const lands =
      spot.column === item.from.column && spot.slot > item.from.beat ? spot.slot - 1 : spot.slot
    if (move !== undefined) void runBeatMove(move, { column: spot.column, beat: lands })
  } else if (item.kind === 'column' && spot.kind === 'column') {
    const move = columnDrop(inFile.value, item.from, spot.slot)
    const lands = spot.slot > item.from ? spot.slot - 1 : spot.slot
    if (move !== undefined) void runColumnMove(move, lands)
  }
})

function overCard(event: DragEvent, column: number, beat: number): void {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  const box = target.getBoundingClientRect()
  drag.over({ kind: 'beat', column, slot: gapAt(beat, event.clientY - box.top, box.height) }, event)
}

function overColumn(event: DragEvent, column: number): void {
  if (drag.dragged.value?.kind === 'beat') {
    // The column's empty area or heading: the end of the column.
    if (!event.defaultPrevented) {
      drag.over({ kind: 'beat', column, slot: shown.value[column]?.beats.length ?? 0 }, event)
    }
    return
  }
  if (shown.value[column]?.inbox === true) {
    drag.over({ kind: 'column', slot: movableCount.value }, event)
    return
  }
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  const box = target.getBoundingClientRect()
  const offset = direction.value === 'rtl' ? box.right - event.clientX : event.clientX - box.left
  drag.over({ kind: 'column', slot: gapAt(column, offset, box.width) }, event)
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
      <p v-if="!readOnly && shown.length > 0" class="muted hint">
        {{ language.t('board-keys-hint') }}
      </p>
      <p v-if="linkNotice" class="muted" role="status">{{ linkNotice }}</p>
    </header>
    <p v-if="plot.moveError.value" class="notice" role="alert">{{ plot.moveError.value }}</p>
    <p class="announcement" role="status" aria-live="polite">{{ plot.announcement.value }}</p>

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
      <ol v-else class="columns" :dir="direction" @dragend="drag.end()">
        <li
          v-for="(column, columnIndex) in shown"
          :key="column.line"
          class="column"
          :class="{
            inbox: column.inbox,
            'gap-before': drag.isColumnGap(columnIndex) && !column.inbox,
            'gap-after': column.inbox
              ? drag.isColumnGap(movableCount)
              : columnIndex === movableCount - 1 && drag.isColumnGap(movableCount)
          }"
          @dragover="overColumn($event, columnIndex)"
          @drop="drag.drop"
        >
          <div class="column-head">
            <h3
              class="column-title"
              dir="auto"
              tabindex="0"
              :data-column="columnIndex"
              :draggable="!readOnly && !column.inbox"
              @dragstart="drag.start({ kind: 'column', from: columnIndex }, $event)"
              @keydown="columnKeydown($event, columnIndex)"
            >
              <span>{{ column.title }}</span>
              <span class="count">{{ chrome.formatNumber(column.beats.length) }}</span>
            </h3>
            <MenuButton
              v-if="columnMenu(columnIndex).length > 0"
              class="more"
              :label="language.t('board-column-menu')"
              :items="columnMenu(columnIndex)"
            />
          </div>
          <ol
            class="beats"
            :class="{ 'gap-end': drag.isBeatGap(columnIndex, column.beats.length) }"
          >
            <li
              v-for="(beat, beatIndex) in column.beats"
              :key="beat.line"
              :class="{ 'gap-before': drag.isBeatGap(columnIndex, beatIndex) }"
            >
              <article
                class="beat"
                :data-position="`${columnIndex}-${beatIndex}`"
                :tabindex="isFocusable({ column: columnIndex, beat: beatIndex }) ? 0 : -1"
                :draggable="
                  !readOnly && editing.editOf({ column: columnIndex, beat: beatIndex }) === null
                "
                @dragstart="
                  drag.start(
                    { kind: 'beat', from: { column: columnIndex, beat: beatIndex } },
                    $event
                  )
                "
                @dragover.stop="overCard($event, columnIndex, beatIndex)"
                @drop.stop="drag.drop"
                @focus="focused = { column: columnIndex, beat: beatIndex }"
                @keydown="keydown($event, { column: columnIndex, beat: beatIndex }, beat)"
              >
                <BeatCard
                  :beat="beat"
                  :threads="threads"
                  :link-targets="linkTargets"
                  :menu="cardMenu({ column: columnIndex, beat: beatIndex }, beat)"
                  :editing="editing.editOf({ column: columnIndex, beat: beatIndex })"
                  :statuses="statuses"
                  @open-link="(link) => plot.openLink(link, path ?? undefined)"
                  @peek="
                    (link, near, byKeyboard) =>
                      peek.peekLink(link, path ?? undefined, near, byKeyboard)
                  "
                  @peek-end="peek.endHover()"
                  @save="
                    (edit, value) =>
                      editing.save({ column: columnIndex, beat: beatIndex }, beat, edit, value)
                  "
                  @cancel="editing.cancel()"
                />
              </article>
            </li>
          </ol>
          <form
            v-if="editing.adding.value === columnIndex"
            class="add-field"
            @submit.prevent="addCard(column)"
          >
            <input
              ref="addInput"
              v-model="newCard"
              type="text"
              dir="auto"
              maxlength="2000"
              :aria-label="language.t('board-add-card-label', column.title)"
              :placeholder="language.t('board-add-card-placeholder')"
              @keydown.escape.prevent.stop="closeAdding(columnIndex)"
            />
          </form>
          <button
            v-else-if="!readOnly"
            type="button"
            class="add-card quiet"
            @click="openAdding(columnIndex)"
          >
            {{ language.t('board-add-card') }}
          </button>
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
  position: relative;
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

.column-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.column-head .column-title {
  flex: 1;
}

.column-title:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.column-title[draggable='true'] {
  cursor: grab;
}

.more {
  opacity: 0;
}

.column:hover .column-head .more,
.column-head:focus-within .more,
.beat:hover :deep(.more),
.beat:focus-within :deep(.more) {
  opacity: 1;
}

/* Where a drop lands: a line between cards, or beside a column on the side it will go. */
.beats > li.gap-before,
.beats.gap-end {
  position: relative;
}

.beats > li.gap-before::before,
.beats.gap-end::after {
  display: block;
  height: 0;
  border-block-start: 2px solid var(--accent);
  content: '';
}

.column.gap-before::before,
.column.gap-after::after {
  position: absolute;
  inset-block: 0;
  border-inline-start: 2px solid var(--accent);
  content: '';
}

.column.gap-before::before {
  inset-inline-start: -8px;
}

.column.gap-after::after {
  inset-inline-end: -8px;
}

.add-card {
  align-self: flex-start;
  padding-block: 2px;
  padding-inline: 6px;
  color: var(--text-muted);
  font-size: 12px;
  opacity: 0;
}

.column:hover .add-card,
.add-card:focus-visible {
  opacity: 1;
}

.add-field input {
  width: 100%;
  padding-block: 6px;
  padding-inline: 8px;
  font: inherit;
  font-size: 13px;
}

.announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.notice {
  margin: 0;
  color: var(--text-dim);
  font-size: 12px;
}

.hint {
  margin-inline-start: auto;
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
