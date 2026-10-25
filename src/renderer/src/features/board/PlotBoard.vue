<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
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
import SelectField from '../../shared/SelectField.vue'
import type { SelectOption } from '../../shared/select-option'
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
import AddColumnTile from './AddColumnTile.vue'
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

const outlineChoices = computed((): SelectOption[] =>
  outlines.outlines.map((outline) => ({
    value: outline.path,
    label: outline.title,
    title: outline.path
  }))
)

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

/**
 * Columns scroll sideways with a soft edge wherever there is more to see, and every outline
 * opens at its first column, in either direction, so no column is ever silently cut off (F9).
 */
const columnsList = useTemplateRef<HTMLElement>('columnsList')
const fades = ref({ 'fade-left': false, 'fade-right': false })

function measureFades(): void {
  const list = columnsList.value
  if (list === null) return
  const travelled = Math.abs(list.scrollLeft)
  const remaining = list.scrollWidth - list.clientWidth - travelled
  const rtl = direction.value === 'rtl'
  fades.value = {
    'fade-left': rtl ? remaining > 1 : travelled > 1,
    'fade-right': rtl ? travelled > 1 : remaining > 1
  }
}

watch(
  () => board.value?.path,
  async () => {
    await nextTick()
    if (columnsList.value !== null) columnsList.value.scrollLeft = 0
    measureFades()
  }
)
watch(
  () => shown.value.length,
  () => void nextTick(measureFades)
)
let resizing: ResizeObserver | undefined
onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  resizing = new ResizeObserver(measureFades)
  if (root.value !== null) resizing.observe(root.value)
})
onBeforeUnmount(() => resizing?.disconnect())

/** The "+ Add column" tile sits after the last column, before the Inbox (D5). */
const tileAt = computed(() => {
  const inbox = shown.value.findIndex((column) => column.inbox)
  return inbox < 0 ? shown.value.length : inbox
})
/** A column just added whose name no part has: the board offers to create the part too. */
const partOffer = ref<string | null>(null)

async function addColumn(title: string, done: () => void): Promise<void> {
  const text = title.trim()
  if (!(await plot.addColumn(text, language.t('board-added-column', isolate(text))))) return
  done()
  const key = (value: string): string => value.normalize('NFC').toLocaleLowerCase()
  const book = manuscript.manuscript
  const parts = [...(book?.parts ?? []), ...(book?.unnumberedParts ?? [])]
  partOffer.value = parts.some((part) => key(part.title) === key(text)) ? null : text
}

async function createPart(): Promise<void> {
  const title = partOffer.value
  partOffer.value = null
  if (title !== null) await manuscript.createPart(title)
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
      <SelectField
        v-if="outlines.outlines.length > 1"
        class="choose"
        :model-value="path ?? ''"
        :options="outlineChoices"
        :aria-label="language.t('outline-panel-select-label')"
        @update:model-value="outlines.choose($event)"
      />
      <h2 v-else-if="outlines.outlines.length === 1" class="title" dir="auto">
        {{ outlines.outlines[0]?.title }}
      </h2>
      <button
        v-if="path !== null"
        type="button"
        class="quiet small edit-text"
        @click="navigation.showOutlineText()"
      >
        {{ language.t('board-edit-text') }}
      </button>
      <details v-if="!readOnly && shown.length > 0" class="help">
        <summary :aria-label="language.t('board-keys-help')" :title="language.t('board-keys-help')">
          ?
        </summary>
        <p class="hint">{{ language.t('board-keys-hint') }}</p>
      </details>
      <p v-if="linkNotice" class="muted" role="status">{{ linkNotice }}</p>
    </header>
    <p v-if="plot.moveError.value" class="notice error" role="alert">{{ plot.moveError.value }}</p>
    <p class="announcement" role="status" aria-live="polite">{{ plot.announcement.value }}</p>
    <div v-if="partOffer !== null" class="offer" role="status">
      <span>{{ language.t('board-create-part-offer', isolate(partOffer)) }}</span>
      <button type="button" class="small primary" @click="createPart">
        {{ language.t('board-create-part') }}
      </button>
      <button type="button" class="small quiet" @click="partOffer = null">
        {{ language.t('board-no-thanks') }}
      </button>
    </div>

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
    <p v-else-if="loading" class="loading" role="status">{{ language.t('board-loading') }}</p>
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
      <template v-if="columns.length === 0">
        <p class="empty">{{ language.t('board-no-columns') }}</p>
        <!-- The first column is one step away; Edit as text is in the header. -->
        <ol v-if="!readOnly" class="columns">
          <AddColumnTile @add="addColumn" />
        </ol>
      </template>
      <ol
        v-else
        ref="columnsList"
        class="columns"
        :class="fades"
        :dir="direction"
        @dragend="drag.end()"
        @scroll="measureFades"
      >
        <template v-for="(column, columnIndex) in shown" :key="column.line">
          <AddColumnTile v-if="!readOnly && columnIndex === tileAt" @add="addColumn" />
          <li
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
        </template>
        <AddColumnTile v-if="!readOnly && tileAt === shown.length" @add="addColumn" />
      </ol>
    </template>
  </section>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
  min-height: 0;
  padding-block: var(--space-5);
  padding-inline: var(--space-5);
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.title {
  margin: 0;
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--text-strong);
}

.choose {
  max-inline-size: 24em;
}

.preamble {
  max-width: var(--measure);
  color: var(--text-dim);
}

.columns {
  --fade-left: 0px;
  --fade-right: 0px;

  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: var(--space-5);
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: auto;
  scroll-padding-inline: var(--space-6);
  list-style: none;
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black var(--fade-left),
    black calc(100% - var(--fade-right)),
    transparent 100%
  );
}

.columns.fade-left {
  --fade-left: 40px;
}

.columns.fade-right {
  --fade-right: 40px;
}

.column {
  position: relative;
  display: flex;
  flex: 0 0 260px;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 100%;
  padding: var(--space-3);
  border-radius: var(--radius-card);
  background: var(--panel);
}

.column.inbox {
  border: 1px dashed var(--line-strong);
  background: transparent;
}

.column-title {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0;
  font-size: var(--text-body);
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
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.beat {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-block: var(--space-3);
  padding-inline: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-field);
  background: var(--raised);
  font-size: var(--text-body);
}

.beat:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.column-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
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
  padding-block: var(--space-1);
  padding-inline: var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-small);
  opacity: 0;
}

.column:hover .add-card,
.add-card:focus-visible {
  opacity: 1;
}

.add-field input {
  width: 100%;
  padding-block: var(--space-3);
  padding-inline: var(--space-3);
  font: inherit;
  font-size: var(--text-body);
}

.announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.help {
  position: relative;
  margin-inline-start: auto;
}

.help summary {
  display: grid;
  place-items: center;
  inline-size: 22px;
  block-size: 22px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--text-muted);
  font-size: var(--text-small);
  cursor: pointer;
  list-style: none;
}

.help summary::-webkit-details-marker {
  display: none;
}

.help .hint {
  animation: rise-in var(--duration-quick) var(--ease-out);
  position: absolute;
  z-index: 10;
  inset-block-start: calc(100% + var(--space-2));
  inset-inline-end: 0;
  inline-size: max-content;
  max-inline-size: 22em;
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-card);
  background: var(--raised);
  box-shadow: var(--shadow-popover);
  color: var(--text);
  font-size: var(--text-small);
}

.offer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  color: var(--text);
  font-size: var(--text-small);
}

.empty {
  max-width: var(--measure);
  margin: 0;
}

.error {
  color: var(--danger);
}

.muted {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-small);
}
</style>
