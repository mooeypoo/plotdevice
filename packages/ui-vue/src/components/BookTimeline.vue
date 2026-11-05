<script setup lang="ts">
import type { ChapterRef, ProjectView, TimelineSectionView, TimelineThreadView } from '@plotdevice/contracts'
import { chapterChips, timelineGrid, type TimelineCell, type TimelineRow } from '@plotdevice/presentation'
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
 * first. The line is written in the book's language.
 */
function cellMenu(row: TimelineRow, cell: TimelineCell): MenuItem[] {
  const own = sectionOf(row, cell)
  const items: MenuItem[] = own?.lineUp ? [{ key: 'unpin', label: t('timeline-unpin'), run: () => void unpin(row.file, cell.section) }] : []
  for (const thread of threads.value) {
    if (thread.file === row.file) continue
    thread.sections.forEach((section, index) => {
      if (section.name === null || section.anchor === null) return
      const name = section.name
      const anchor = section.anchor
      items.push({
        key: `${thread.file}#${anchor}`,
        label: thread === main.value ? name : `${nameOf(thread)}: ${name}`,
        group: thread.file,
        disabled: own?.lineUp?.kind === 'section' && own.lineUp.outline === thread.file && own.lineUp.section === index,
        run: () => void lineUp(row.file, cell.section, { outline: thread.file, anchor, text: name }),
      })
    })
  }
  return items
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
          <div v-for="(column, index) in grid.columns" :key="column.key" class="timeline-moment" :class="{ gap: column.main === null }">
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
            :class="[cell.state, { named: !row.isMain }]"
            :style="{ gridColumn: cell.column + 1 }"
            :aria-label="cellLabel(row, cell)"
            role="group"
          >
            <div v-if="!row.isMain" class="cell-head">
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
                :items="cellMenu(row, cell)"
              />
            </div>
            <article v-for="(item, i) in cell.items" :key="i" class="timeline-card">
              <p><InlineText :text="item.text" /></p>
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
