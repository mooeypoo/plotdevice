<script setup lang="ts">
import type { SplitByView } from '@plotdevice/contracts'
import { computed, ref, watch } from 'vue'
import { useImportStore } from '../stores/import'
import { useSettingsStore } from '../stores/settings'

// The preview of a Word file's chapters (Milestone 23; owner's decisions and mockup, 2026-11-07): how
// it splits, and the author's changes, before anything is made. The Word file is never changed.
const imports = useImportStore()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const selected = ref(0)
const partName = ref('')

const SPLITS: SplitByView[] = ['headings', 'chapter-lines', 'page-breaks']
const chapters = computed(() => imports.plan?.chapters ?? [])
const current = computed(() => chapters.value[selected.value] ?? null)
const paragraphs = computed(() => imports.started?.paragraphs ?? [])
const parts = computed(() => new Set(imports.kept.map((chapter) => chapter.part).filter((part) => part !== null)).size)
/** When adding to a book, chapters the file doesn't put in a part go into a new one, named here. */
const needsPartName = computed(() => imports.purpose === 'add' && imports.kept.some((chapter) => chapter.part === null))
const leftOut = computed(() => {
  const counts = imports.started?.leftOut
  if (!counts) return []
  return [
    counts.comments > 0 ? t('import-left-comments', String(counts.comments)) : null,
    counts.pictures > 0 ? t('import-left-pictures', String(counts.pictures)) : null,
    counts.tables > 0 ? t('import-left-tables', String(counts.tables)) : null,
  ].filter((text): text is string => text !== null)
})

watch(
  () => imports.open,
  (open) => {
    if (!open) return dialog.value?.close()
    selected.value = 0
    const from = imports.started
    partName.value = from?.title ?? from?.fileName.replace(/\.docx$/i, '') ?? ''
    dialog.value?.showModal()
  },
)
watch(chapters, (list) => {
  if (selected.value >= list.length) selected.value = Math.max(0, list.length - 1)
})

/** A part's name above its first chapter in the list. */
const partAbove = (index: number): string | null => {
  const part = chapters.value[index]?.part ?? null
  return part !== null && part !== (chapters.value[index - 1]?.part ?? null) ? part : null
}

async function startHere(paragraph: number): Promise<void> {
  await imports.startHere(paragraph)
  const index = chapters.value.findIndex((chapter) => chapter.start === paragraph)
  if (index >= 0) selected.value = index
}

async function joinUp(): Promise<void> {
  if (!current.value || selected.value === 0) return
  const start = current.value.start
  selected.value -= 1
  await imports.joinUp(start)
}

function finish(): void {
  if (imports.purpose === 'add') void imports.addToBook(partName.value.trim() || (imports.started?.fileName ?? ''))
  else imports.toNewBook()
}

function onClose(): void {
  // Closed by Cancel or Esc while still open; "Next" has already handed the import on.
  if (imports.open) imports.close()
}
</script>

<template>
  <dialog ref="dialog" class="dialog import-dialog" data-testid="import-dialog" aria-labelledby="import-title" @close="onClose">
    <template v-if="imports.started && imports.plan">
      <h2 id="import-title">{{ t('import-title', imports.started.fileName) }}</h2>

      <div class="import-split">
        <span id="import-split-label" class="group-label">{{ t('import-split-by') }}</span>
        <div class="segmented" role="group" aria-labelledby="import-split-label">
          <button
            v-for="split in SPLITS"
            :key="split"
            type="button"
            :aria-pressed="imports.plan.split === split"
            :data-testid="`import-split-${split}`"
            @click="imports.splitBy(split)"
          >
            {{ t(`import-split-${split}`) }}
          </button>
        </div>
        <span class="secondary" data-testid="import-found">{{
          parts > 0 ? t('import-found-parts', String(imports.kept.length), String(parts)) : t('import-found', String(imports.kept.length))
        }}</span>
      </div>
      <p class="secondary">{{ t(`import-split-${imports.plan.split}-hint`) }}</p>

      <div class="import-preview">
        <div class="import-list">
          <ul class="import-chapters" :aria-label="t('import-chapters')">
            <li v-for="(chapter, index) in chapters" :key="`${imports.plan.split}:${chapter.start}`">
              <span v-if="partAbove(index)" class="group-label import-part"
                ><bdi>{{ partAbove(index) }}</bdi></span
              >
              <div class="import-chapter" :class="{ selected: index === selected, out: !chapter.included }" @click="selected = index">
                <input
                  type="checkbox"
                  :checked="chapter.included"
                  :aria-label="t('import-keep', chapter.name)"
                  :data-testid="`import-keep-${index}`"
                  @change="imports.include(chapter.start, ($event.target as HTMLInputElement).checked)"
                />
                <input
                  class="import-name"
                  type="text"
                  dir="auto"
                  :value="chapter.name"
                  :aria-label="t('import-rename', String(index + 1))"
                  :data-testid="`import-name-${index}`"
                  @focus="selected = index"
                  @change="imports.rename(chapter.start, ($event.target as HTMLInputElement).value)"
                />
                <span class="secondary import-words">{{ t('import-words', String(chapter.words)) }}</span>
              </div>
            </li>
          </ul>
          <p class="secondary">{{ t('import-list-hint') }}</p>
        </div>

        <div class="import-text" dir="auto" data-testid="import-text">
          <template v-if="current">
            <h3 dir="auto">{{ current.name }}</h3>
            <button v-if="selected > 0" type="button" class="link-button import-join" data-testid="import-join" @click="joinUp">
              {{ t('import-join') }}
            </button>
            <div v-for="(paragraph, n) in current.body" :key="paragraph" class="import-paragraph" :class="paragraphs[paragraph]?.kind">
              <button
                v-if="n > 0"
                type="button"
                class="link-button import-start-here"
                :data-testid="`import-start-${paragraph}`"
                @click="startHere(paragraph)"
              >
                {{ t('import-start-here') }}
              </button>
              <p dir="auto">{{ paragraphs[paragraph]?.text }}</p>
            </div>
          </template>
        </div>
      </div>

      <div class="import-note" data-testid="import-note">
        <span v-if="leftOut.length > 0"
          ><strong>{{ t('import-left-out') }}</strong> {{ leftOut.join(', ') }}.</span
        >
        <span>{{ t('import-tracked-changes') }}</span>
        <span v-if="imports.started.footnotes > 0">{{ t('import-footnotes', String(imports.started.footnotes)) }}</span>
      </div>

      <label v-if="needsPartName" class="field import-part-name">
        {{ t('import-part-name') }}
        <input v-model="partName" type="text" dir="auto" data-testid="import-part-name" />
      </label>

      <div class="actions">
        <button type="button" data-testid="import-cancel" @click="imports.close()">{{ t('prompt-cancel') }}</button>
        <button
          type="button"
          class="primary"
          data-testid="import-next"
          :disabled="imports.kept.length === 0 || imports.busy || (needsPartName && partName.trim() === '')"
          @click="finish"
        >
          {{ imports.purpose === 'add' ? t('import-add', String(imports.kept.length)) : t('import-next') }}
        </button>
      </div>
    </template>
  </dialog>
</template>

<style scoped>
.import-dialog {
  inline-size: min(64rem, calc(100vw - 2rem));
}
.import-dialog > * + * {
  margin-block-start: 0.9rem;
}
.import-split {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
  align-items: center;
}
.import-preview {
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  gap: 1rem;
}
@media (max-width: 720px) {
  .import-preview {
    grid-template-columns: minmax(0, 1fr);
  }
}
.import-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-inline-size: 0;
}
.import-chapters {
  list-style: none;
  margin: 0;
  padding: 0.4rem;
  max-block-size: 26rem;
  overflow-y: auto;
  background: var(--color-page);
  border-radius: 12px;
}
.import-part {
  display: block;
  margin-block: 0.5rem 0.1rem;
  padding-inline: 0.4rem;
}
.import-chapter {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.25rem 0.4rem;
  border-radius: 8px;
  cursor: pointer;
}
.import-chapter.selected {
  background: var(--color-well);
}
.import-chapter.out .import-name {
  color: var(--color-text-secondary);
  text-decoration: line-through;
}
.import-name {
  font: inherit;
  color: var(--color-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.15rem 0.35rem;
  min-inline-size: 0;
}
.import-name:hover,
.import-name:focus {
  border-color: color-mix(in srgb, var(--color-text) 18%, transparent);
  background: var(--color-card);
}
.import-words {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.import-text {
  background: var(--color-page);
  border-radius: 12px;
  padding: 1rem 1.3rem;
  max-block-size: 30rem;
  overflow-y: auto;
  font-family: var(--font-prose);
  min-inline-size: 0;
}
.import-text h3 {
  text-align: center;
  font-weight: 500;
  margin-block: 0 0.5rem;
}
.import-join {
  font-family: var(--font-ui);
  font-size: 0.85rem;
}
.import-paragraph {
  position: relative;
}
.import-paragraph p {
  margin-block: 0.5rem;
  line-height: 1.6;
}
.import-paragraph.heading p {
  font-style: italic;
}
.import-paragraph.quote p {
  margin-inline: 1.5rem;
}
.import-paragraph.list-item p::before {
  content: '• ';
  color: var(--color-mark);
}
/* "＋ New chapter here" shows over a paragraph on hover, and when it has keyboard focus. */
.import-start-here {
  position: absolute;
  inset-block-start: -0.9rem;
  inset-inline-start: 0;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.15s;
}
.import-paragraph:hover .import-start-here,
.import-start-here:focus-visible {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .import-start-here {
    transition: none;
  }
}
.import-note {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: var(--color-page);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  font-size: 0.9rem;
}
.import-part-name {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-inline-size: 24rem;
}
</style>
