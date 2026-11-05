<script setup lang="ts">
import type { ChapterRef, ProjectView, TimelineSectionView, TimelineThreadView } from '@plotdevice/contracts'
import { boardDrop, chapterChips, lineUpChoices, timelineGrid, type TimelineCell, type TimelineRow } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, ref, watch } from 'vue'
import { useConfirm } from '../composables/use-confirm'
import { useKinds } from '../composables/use-kinds'
import { usePrompt } from '../composables/use-prompt'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import EditableText from './EditableText.vue'
import InlineText from './InlineText.vue'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'

// The book's timeline (ADR 0012): one row per outline, the main outline's sections as the columns.
// It only draws the grid `timelineGrid` gives it; where it opens from is the sidebar's business.
const props = defineProps<{ project: ProjectView }>()
const emit = defineEmits<{ 'new-outline': [] }>()
const story = useStoryStore()
const settings = useSettingsStore()
const kinds = useKinds()
const { confirm } = useConfirm()
const { ask } = usePrompt()
const t = settings.t

/** Rows the author hid, per book, in this app's own storage; the outlines are untouched. */
const hiddenKey = computed(() => `plotdevice:timeline-hidden:${props.project.root}`)
function loadHidden(): Set<ProjectPath> {
  try {
    return new Set(JSON.parse(localStorage.getItem(hiddenKey.value) ?? '[]') as ProjectPath[])
  } catch {
    return new Set()
  }
}
const hidden = ref(loadHidden())
watch(hiddenKey, () => (hidden.value = loadHidden()))
function setHidden(next: Set<ProjectPath>): void {
  hidden.value = next
  try {
    localStorage.setItem(hiddenKey.value, JSON.stringify([...next]))
  } catch {
    // Not remembered this time; the row is still hidden.
  }
}

const threads = computed(() => story.timeline?.threads ?? [])
const main = computed<TimelineThreadView | null>(() => threads.value[0] ?? null)
const nameOf = (thread: { file: ProjectPath; title: string | null } | null | undefined): string => thread?.title ?? thread?.file ?? ''
const mainName = computed(() => nameOf(main.value))
// The main outline is never hidden: its sections are the columns.
const shownHidden = computed(() => new Set([...hidden.value].filter((file) => file !== main.value?.file)))
const grid = computed(() => (story.timeline ? timelineGrid(story.timeline, shownHidden.value) : null))
const hiddenCount = computed(() => threads.value.filter((thread) => shownHidden.value.has(thread.file)).length)
const columnsStyle = computed(() => ({
  gridTemplateColumns: (grid.value?.columns ?? [])
    .map((column) => (column.main === null ? 'minmax(9rem, 0.8fr)' : 'minmax(11rem, 1fr)'))
    .join(' '),
}))

const chapters = computed<ChapterRef[]>(() =>
  props.project.contents.flatMap((entry) => (entry.kind === 'chapter' ? [entry] : entry.chapters)),
)
const chipLabel = (chapter: ChapterRef): string =>
  chapter.number === null ? chapter.linkText : `${kinds.chapters.number(chapter.number)} · ${chapter.linkText}`
const sectionOf = (row: TimelineRow, cell: TimelineCell): TimelineSectionView | undefined =>
  threads.value.find((thread) => thread.file === row.file)?.sections[cell.section]

/** Renaming a column renames that section of the main outline (and the line-ups pointing to it). */
const renaming = ref<number | null>(null)
async function rename(section: number, text: string | null): Promise<void> {
  renaming.value = null
  const file = main.value?.file
  const current = main.value?.sections[section]?.name
  if (file && text !== null && text.trim() !== '' && text !== current) await story.editIn(file, { kind: 'rename-section', section, text })
}

/** + after a column: a new section of the main outline, right after that one. */
async function addSection(after: number): Promise<void> {
  const file = main.value?.file
  const name = await ask(t('prompt-section-name'))
  if (file && name && name.trim() !== '') await story.editIn(file, { kind: 'add-section', index: after + 1, text: name })
}

async function addCard(row: TimelineRow, cell: TimelineCell): Promise<void> {
  const text = await ask(t('prompt-card-text'))
  if (text && text.trim() !== '')
    await story.editIn(row.file, { kind: 'add-item', to: { section: cell.section, parentPath: [], index: cell.items.length }, text })
}

async function makeMain(file: ProjectPath): Promise<void> {
  const thread = threads.value.find((each) => each.file === file)
  if (await confirm(t('main-swap-question', nameOf(thread)), t('main-swap-action'))) await story.makeMain(file)
}

const otherOutlines = computed<MenuItem[]>(() =>
  threads.value.slice(1).map((thread) => ({ key: thread.file, label: nameOf(thread), run: () => void makeMain(thread.file) })),
)

function rowMenu(row: TimelineRow): MenuItem[] {
  return [
    ...(row.isMain ? [] : [{ key: 'make-main', label: t('outline-make-main'), run: () => void makeMain(row.file) }]),
    { key: 'open', label: t('story-open-outline'), run: () => void story.open(row.file) },
    ...(row.isMain
      ? []
      : [{ key: 'hide', label: t('timeline-hide'), group: 'hide', run: () => setHidden(new Set([...hidden.value, row.file])) }]),
  ]
}

/**
 * A section's menu: unpin it, or line it up with a section of another outline, the main outline's
 * first. Only moments that keep every storyline's order are offered. Built when it opens.
 */
function cellMenu(row: TimelineRow, cell: TimelineCell): MenuItem[] {
  const own = sectionOf(row, cell)
  const choices = story.timeline ? lineUpChoices(story.timeline, row.file, cell.section) : new Set<string>()
  const items: MenuItem[] = own?.lineUp ? [{ key: 'unpin', label: t('timeline-unpin'), run: () => void unpin(row.file, cell.section) }] : []
  for (const thread of threads.value) {
    if (thread.file === row.file) continue
    let first = true
    thread.sections.forEach((section, index) => {
      const target = targetOf(thread, index)
      if (!target || !choices.has(`${thread.file}#${index}`)) return
      const current = own?.lineUp?.kind === 'section' && own.lineUp.outline === thread.file && own.lineUp.section === index
      items.push({
        key: `${thread.file}#${target.anchor}`,
        label: thread === main.value ? target.text : `${nameOf(thread)}: ${target.text}`,
        ...(first ? { group: thread.file } : {}),
        disabled: current,
        run: () => void lineUp(row.file, cell.section, target),
      })
      first = false
    })
  }
  return items
}

/** What a line-up to section `index` of `thread` writes; `null` for cards before the first section. */
function targetOf(thread: TimelineThreadView | undefined, index: number): { outline: ProjectPath; anchor: string; text: string } | null {
  const section = thread?.sections[index]
  return thread && section?.name && section.anchor ? { outline: thread.file, anchor: section.anchor, text: section.name } : null
}

/**
 * Dragging (with menus as the keyboard's way): a section onto a moment of another storyline lines it
 * up there, and only moments that keep every storyline's order take it; a card moves between the
 * moments of its own storyline, as on the Board. Cards never move to another storyline.
 */
type Dragging =
  | { kind: 'section'; file: ProjectPath; section: number; choices: Set<string> }
  | { kind: 'card'; file: ProjectPath; section: number; index: number }
const dragging = ref<Dragging | null>(null)
/** Where a drop would land: a section (`file#index`), and for a card, before which card. */
const over = ref<{ key: string; before?: number } | null>(null)

function startSection(event: DragEvent, row: TimelineRow, cell: TimelineCell): void {
  if (!story.timeline) return
  dragging.value = {
    kind: 'section',
    file: row.file,
    section: cell.section,
    choices: lineUpChoices(story.timeline, row.file, cell.section),
  }
  event.dataTransfer?.setData('text/plain', cell.name ?? '')
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'link'
}

function startCard(event: DragEvent, row: TimelineRow, cell: TimelineCell, index: number): void {
  event.stopPropagation()
  dragging.value = { kind: 'card', file: row.file, section: cell.section, index }
  event.dataTransfer?.setData('text/plain', cell.items[index]?.text ?? '')
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

/** Over a moment, or a section of a storyline: lights it up when the dragged thing can land there. */
function onOver(event: DragEvent, file: ProjectPath, section: number): void {
  const from = dragging.value
  if (!from) return
  const key = `${file}#${section}`
  if (from.kind === 'section') {
    if (!from.choices.has(key)) return
    event.preventDefault()
    over.value = { key }
    return
  }
  if (from.file !== file) return
  event.preventDefault()
  // Over a card's top half, the gap above it; past every card, the end.
  const cards = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.timeline-card[data-index]')]
  const above = cards.find((card) => event.clientY < card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2)
  const count = threads.value.find((thread) => thread.file === file)?.sections[section]?.items.length ?? 0
  over.value = { key, before: above ? Number(above.dataset.index) : count }
}

function onLeave(event: DragEvent): void {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) over.value = null
}

async function onDrop(file: ProjectPath, section: number): Promise<void> {
  const from = dragging.value
  const at = over.value
  dragging.value = null
  over.value = null
  if (!from || at?.key !== `${file}#${section}`) return
  if (from.kind === 'section') {
    const target = targetOf(
      threads.value.find((thread) => thread.file === file),
      section,
    )
    if (target) await lineUp(from.file, from.section, target)
    return
  }
  const to = boardDrop({ section: from.section, path: [from.index] }, section, at.before ?? 0)
  if (to) await story.editIn(file, { kind: 'move-item', from: { section: from.section, path: [from.index] }, to })
}

function endDrag(): void {
  dragging.value = null
  over.value = null
}

const dropClass = (file: ProjectPath, section: number): string => (over.value?.key === `${file}#${section}` ? 'drop-into' : '')
/** The gold line before a card, or after the last one, where a dragged card would land. */
function cardDrop(row: TimelineRow, cell: TimelineCell, index: number): string {
  const at = over.value
  if (dragging.value?.kind !== 'card' || at?.key !== `${row.file}#${cell.section}`) return ''
  if (at.before === index) return 'drop-before'
  return at.before === cell.items.length && index === cell.items.length - 1 ? 'drop-after' : ''
}

/** The keyboard's way to move a card: to another moment of its own storyline. */
function cardMenu(row: TimelineRow, cell: TimelineCell, index: number): MenuItem[] {
  const thread = threads.value.find((each) => each.file === row.file)
  return (thread?.sections ?? []).flatMap((section, to) =>
    to === cell.section
      ? []
      : [
          {
            key: `move-${to}`,
            label: t('timeline-move-to', section.name ?? t('outline-unnamed-section')),
            run: () =>
              void story.editIn(row.file, {
                kind: 'move-item',
                from: { section: cell.section, path: [index] },
                to: { section: to, parentPath: [], index: section.items.length },
              }),
          },
        ],
  )
}

async function lineUp(file: ProjectPath, section: number, target: { outline: ProjectPath; anchor: string; text: string }): Promise<void> {
  const words = settings.tIn(props.project.language, 'timeline-same-time-as')
  await story.editIn(file, { kind: 'line-up-section', section, lineUp: target, words })
}

const unpin = (file: ProjectPath, section: number) => story.editIn(file, { kind: 'unpin-section', section })

/** What the section's mark says: lined up with what, or why it can't be. */
function markOf(row: TimelineRow, cell: TimelineCell): { symbol: string; text: string } | null {
  const lineUp = sectionOf(row, cell)?.lineUp
  if (cell.state === 'missing') return { symbol: '!', text: t('timeline-cant-line-up-missing', lineUp?.text ?? '') }
  const target =
    lineUp?.kind === 'section' ? threads.value.find((thread) => thread.file === lineUp.outline)?.sections[lineUp.section]?.name : null
  if (cell.state === 'contradicts') return { symbol: '!', text: t('timeline-cant-line-up-order', target ?? lineUp?.text ?? '') }
  return lineUp && target ? { symbol: '⇄', text: t('timeline-lined-up-with', target) } : null
}

const cellLabel = (row: TimelineRow, cell: TimelineCell): string =>
  [nameOf(row), cell.name ?? t('outline-unnamed-section'), cell.state === 'not-lined-up' ? t('timeline-not-lined-up') : '']
    .filter(Boolean)
    .join(', ')
</script>

<template>
  <div class="timeline" data-testid="timeline">
    <p v-if="main" class="timeline-source secondary" data-testid="timeline-source">
      {{ t('timeline-columns-from') }}
      <strong dir="auto">{{ mainName }}</strong>
      <MenuButton
        v-if="otherOutlines.length > 0"
        :label="t('timeline-change-main')"
        :text="t('timeline-change-main')"
        :items="otherOutlines"
        button-class="link-button"
        testid="change-main"
      />
      <span aria-hidden="true"> · </span>{{ t('timeline-columns-hint') }}
    </p>

    <div v-if="grid && grid.rows.length > 0" class="timeline-scroll">
      <div class="timeline-grid" :style="columnsStyle">
        <!-- The columns: the main outline's sections, and untitled gaps between them. -->
        <div class="timeline-axis" role="presentation">
          <div
            v-for="(column, index) in grid.columns"
            :key="column.key"
            class="timeline-moment"
            :class="[{ gap: column.main === null }, main && column.main !== null ? dropClass(main.file, column.main) : '']"
            @dragover="main && column.main !== null && onOver($event, main.file, column.main)"
            @dragleave="onLeave"
            @drop.prevent="main && column.main !== null && onDrop(main.file, column.main)"
          >
            <template v-if="column.main !== null">
              <EditableText
                v-if="renaming === column.main"
                :value="column.title ?? ''"
                :label="t('prompt-section-name')"
                @commit="rename(column.main, $event)"
              />
              <button
                v-else-if="column.title !== null"
                type="button"
                class="moment-name"
                dir="auto"
                :title="t('timeline-rename-column', mainName)"
                :data-testid="`column-${index}`"
                @click="renaming = column.main"
              >
                {{ column.title }}
              </button>
              <span v-else class="moment-name" dir="auto">{{ t('outline-unnamed-section') }}</span>
              <button
                type="button"
                class="moment-add"
                :aria-label="t('timeline-add-section-here', mainName)"
                :title="t('timeline-add-section-here', mainName)"
                data-testid="add-moment"
                @click="addSection(column.main)"
              >
                +
              </button>
            </template>
            <span class="moment-dot" aria-hidden="true"></span>
          </div>
        </div>

        <section
          v-for="row in grid.rows"
          :key="row.file"
          class="timeline-row"
          :class="{ main: row.isMain }"
          :aria-label="t('timeline-storyline', nameOf(row))"
          :data-storyline="row.file"
        >
          <h3 class="storyline-name">
            <button type="button" class="storyline-open" dir="auto" @click="story.open(row.file)">{{ nameOf(row) }}</button>
            <span v-if="row.isMain" class="main-badge">{{ t('timeline-main-outline') }}</span>
            <MenuButton :label="t('timeline-storyline-actions', nameOf(row))" :items="rowMenu(row)" />
          </h3>
          <div
            v-for="cell in row.cells"
            :key="cell.section"
            class="timeline-cell"
            :class="[
              cell.state,
              {
                named: !row.isMain,
                lifted: dragging?.kind === 'section' && dragging.file === row.file && dragging.section === cell.section,
              },
              dropClass(row.file, cell.section),
            ]"
            :style="{ gridColumn: cell.column + 1 }"
            :aria-label="cellLabel(row, cell)"
            role="group"
            :data-section="cell.section"
            @dragover="onOver($event, row.file, cell.section)"
            @dragleave="onLeave"
            @drop.prevent="onDrop(row.file, cell.section)"
          >
            <div
              v-if="!row.isMain"
              class="cell-head"
              :draggable="cell.name !== null"
              :title="cell.name !== null ? t('timeline-drag-section') : undefined"
              @dragstart="startSection($event, row, cell)"
              @dragend="endDrag"
            >
              <span dir="auto">{{ cell.name ?? t('outline-unnamed-section') }}</span>
              <span
                v-if="markOf(row, cell)"
                class="cell-mark"
                :class="cell.state"
                :title="markOf(row, cell)?.text"
                role="img"
                :aria-label="markOf(row, cell)?.text"
              >
                {{ markOf(row, cell)?.symbol }}
              </span>
              <MenuButton
                v-if="cell.name !== null"
                :label="t('timeline-moment-actions', cell.name)"
                :heading="t('timeline-line-up-title', cell.name)"
                :items="() => cellMenu(row, cell)"
              />
            </div>
            <article
              v-for="(item, i) in cell.items"
              :key="i"
              class="timeline-card"
              :class="[
                cardDrop(row, cell, i),
                {
                  lifted:
                    dragging?.kind === 'card' && dragging.file === row.file && dragging.section === cell.section && dragging.index === i,
                },
              ]"
              :data-index="i"
              :draggable="item.movable"
              @dragstart="startCard($event, row, cell, i)"
              @dragend="endDrag"
            >
              <div class="timeline-card-text">
                <p><InlineText :text="item.text" /></p>
                <MenuButton
                  v-if="item.movable && row.cells.length > 1"
                  :label="t('timeline-card-actions', item.text)"
                  :items="() => cardMenu(row, cell, i)"
                />
              </div>
              <span v-for="chapter in chapterChips(item.text, chapters)" :key="chapter.file" class="chapter-chip" dir="auto">
                {{ chipLabel(chapter) }}
              </span>
            </article>
            <button type="button" class="add timeline-add-card" @click="addCard(row, cell)">+ {{ t('timeline-add-card') }}</button>
          </div>
        </section>
      </div>
    </div>

    <p v-if="hiddenCount > 0" class="timeline-hidden secondary" role="status">
      {{ t('timeline-hidden', hiddenCount) }}
      <button type="button" class="link-button" @click="setHidden(new Set())">{{ t('timeline-show-all') }}</button>
    </p>

    <div v-if="threads.length === 1" class="timeline-one" data-testid="timeline-one">
      <h2>{{ t('timeline-one-title') }}</h2>
      <p class="secondary">{{ t('timeline-one-text') }}</p>
      <button type="button" class="primary" @click="emit('new-outline')">{{ t('timeline-new-storyline') }}</button>
    </div>
  </div>
</template>
