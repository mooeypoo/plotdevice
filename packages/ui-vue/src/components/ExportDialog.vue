<script setup lang="ts">
import type { ExportChoicesView, ExportWindowView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, ref, watch } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'

// The Export window (Milestone 22, owner's decisions 2026-11-07): Word, PDF, e-book or Markdown, with
// only the choices that apply to the format. The title and author typed here are the book's own.
const api = useApi()
const store = useProjectStore()
const view = useViewStore()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)

const FORMATS = ['word', 'pdf', 'epub', 'markdown'] as const
/** The title a book has when it was never named; treated as no title. */
const UNTITLED = 'Untitled project'

const info = ref<ExportWindowView | null>(null)
const choices = ref<ExportChoicesView | null>(null)
const title = ref('')
const author = ref('')
const coverName = ref<string | null>(null)
const coverMissing = ref(false)
const busy = ref(false)

/** Chapters in reading order, with their part, for "Choose chapters…". */
const chapterList = computed(() =>
  (store.project?.contents ?? []).flatMap((entry) =>
    entry.kind === 'chapter'
      ? [{ file: entry.file, title: entry.linkText, part: null as string | null }]
      : entry.chapters.map((chapter) => ({ file: chapter.file, title: chapter.linkText, part: entry.name })),
  ),
)
const chosen = computed(() => new Set(choices.value?.chapters === 'all' ? [] : (choices.value?.chapters ?? [])))
const paged = computed(() => choices.value?.format === 'word' || choices.value?.format === 'pdf')
const titleMissing = computed(() => title.value.trim() === '' || title.value.trim() === UNTITLED)
const titleChanged = computed(() => !titleMissing.value && title.value.trim() !== (store.project?.title ?? ''))
const authorChanged = computed(() => author.value.trim() !== '' && author.value.trim() !== (store.project?.author ?? ''))
const noneChosen = computed(() => choices.value?.chapters !== 'all' && chosen.value.size === 0)
const extension = computed(() => ({ word: 'docx', pdf: 'pdf', epub: 'epub', markdown: 'md' })[choices.value?.format ?? 'word'])
const savesAs = computed(() => `${titleMissing.value ? (store.project?.title ?? UNTITLED) : title.value.trim()}.${extension.value}`)

watch(
  () => view.exportDialog,
  async (open) => {
    if (!open) return dialog.value?.close()
    const opened = await api.exportWindow()
    if (!opened.ok) {
      view.exportDialog = false
      return
    }
    info.value = opened.value
    choices.value = { ...opened.value.choices }
    coverName.value = opened.value.coverName
    coverMissing.value = opened.value.coverMissing
    title.value = store.project?.title ?? ''
    author.value = store.project?.author ?? ''
    dialog.value?.showModal()
  },
)

function set<K extends keyof ExportChoicesView>(key: K, value: ExportChoicesView[K]): void {
  if (choices.value) choices.value = { ...choices.value, [key]: value }
}

function toggleChapter(file: ProjectPath, on: boolean): void {
  const next = new Set(chosen.value)
  if (on) next.add(file)
  else next.delete(file)
  // Kept in reading order, so the remembered list reads like the book.
  set(
    'chapters',
    chapterList.value.filter((chapter) => next.has(chapter.file)).map((chapter) => chapter.file),
  )
}

const chooseSome = (files: ProjectPath[]) => set('chapters', files)

async function chooseCover(): Promise<void> {
  const picked = await api.chooseExportCover()
  if (!picked.ok) return
  set('cover', picked.value.path)
  coverName.value = picked.value.name
  coverMissing.value = false
}

function removeCover(): void {
  set('cover', null)
  coverName.value = null
  coverMissing.value = false
}

async function exportNow(): Promise<void> {
  if (!choices.value || noneChosen.value || busy.value) return
  busy.value = true
  try {
    // A missing cover is left out rather than stopping the export.
    // A plain copy: Vue's reactive objects can't be sent to the host.
    const plain = JSON.parse(JSON.stringify(choices.value)) as ExportChoicesView
    const request = { choices: coverMissing.value ? { ...plain, cover: null } : plain, title: title.value, author: author.value }
    if (await store.exportBook(request)) view.exportDialog = false
  } finally {
    busy.value = false
  }
}

function close(): void {
  view.exportDialog = false
}
</script>

<template>
  <dialog ref="dialog" class="dialog export-dialog" data-testid="export-dialog" aria-labelledby="export-title" @close="close">
    <form v-if="choices && info" method="dialog" @submit.prevent="exportNow">
      <h2 id="export-title">{{ t('export-title') }}</h2>

      <section class="export-group">
        <h3 id="export-format" class="group-label">{{ t('export-format') }}</h3>
        <div class="segmented export-formats" role="group" aria-labelledby="export-format">
          <button
            v-for="format in FORMATS"
            :key="format"
            type="button"
            :aria-pressed="choices.format === format"
            :data-testid="`export-format-${format}`"
            @click="set('format', format)"
          >
            {{ t(`export-format-${format}`) }}
          </button>
        </div>
        <p class="secondary" data-testid="export-format-hint">{{ t(`export-format-${choices.format}-hint`) }}</p>
      </section>

      <section class="export-group">
        <label v-if="paged" class="check">
          <input
            type="checkbox"
            :checked="choices.titlePage"
            data-testid="export-title-page"
            @change="set('titlePage', ($event.target as HTMLInputElement).checked)"
          />
          {{ t('export-title-page') }}
        </label>
        <label class="field">
          {{ t('export-book-title') }}
          <input
            v-model="title"
            type="text"
            dir="auto"
            :placeholder="UNTITLED"
            :aria-invalid="titleMissing"
            data-testid="export-book-title"
          />
        </label>
        <p v-if="titleMissing" class="warning" data-testid="export-no-title">⚠ {{ t('export-no-title') }}</p>
        <label class="field">
          {{ t('export-book-author') }}
          <input v-model="author" type="text" dir="auto" data-testid="export-book-author" />
        </label>
        <p class="secondary">
          {{ t(paged ? 'export-author-hint-page' : choices.format === 'epub' ? 'export-author-hint-epub' : 'export-author-hint-markdown') }}
        </p>
        <p v-if="titleChanged || authorChanged" class="secondary" data-testid="export-saves-details">{{ t('export-saves-details') }}</p>
        <label v-if="paged && choices.titlePage" class="check">
          <input
            type="checkbox"
            :checked="choices.wordCount"
            data-testid="export-word-count"
            @change="set('wordCount', ($event.target as HTMLInputElement).checked)"
          />
          {{ t('export-word-count') }} <span class="secondary">({{ t('export-word-count-about', info.wordCount) }})</span>
        </label>
      </section>

      <fieldset class="export-group">
        <legend class="group-label">{{ t('export-chapters') }}</legend>
        <label class="check">
          <input
            type="radio"
            name="export-scope"
            :checked="choices.chapters === 'all'"
            data-testid="export-whole-book"
            @change="set('chapters', 'all')"
          />
          {{ t('export-whole-book', String(chapterList.length)) }}
        </label>
        <label class="check">
          <input
            type="radio"
            name="export-scope"
            :checked="choices.chapters !== 'all'"
            data-testid="export-some-chapters"
            @change="chooseSome(chapterList.slice(0, 3).map((c) => c.file))"
          />
          {{ t('export-choose-chapters') }}
        </label>
        <div v-if="choices.chapters !== 'all'" class="export-chooser">
          <div class="actions start">
            <button
              type="button"
              class="link"
              data-testid="export-first-three"
              @click="chooseSome(chapterList.slice(0, 3).map((c) => c.file))"
            >
              {{ t('export-first-three') }}
            </button>
            <button type="button" class="link" data-testid="export-all" @click="chooseSome(chapterList.map((c) => c.file))">
              {{ t('export-all') }}
            </button>
            <button type="button" class="link" data-testid="export-none" @click="chooseSome([])">{{ t('export-none') }}</button>
          </div>
          <ul class="export-chapter-list">
            <li v-for="(chapter, index) in chapterList" :key="chapter.file">
              <span v-if="chapter.part && chapter.part !== chapterList[index - 1]?.part" class="group-label export-part"
                ><bdi>{{ chapter.part }}</bdi></span
              >
              <label class="check">
                <input
                  type="checkbox"
                  :checked="chosen.has(chapter.file)"
                  :data-testid="`export-chapter-${chapter.file}`"
                  @change="toggleChapter(chapter.file, ($event.target as HTMLInputElement).checked)"
                />
                <bdi>{{ chapter.title }}</bdi>
              </label>
            </li>
          </ul>
          <p v-if="noneChosen" class="warning" role="status">{{ t('export-none-chosen') }}</p>
        </div>
      </fieldset>

      <fieldset v-if="info.numbered" class="export-group">
        <legend class="group-label">{{ t('export-headings') }}</legend>
        <label class="check">
          <input
            type="radio"
            name="export-headings"
            :checked="choices.headings === 'number-and-name'"
            data-testid="export-headings-both"
            @change="set('headings', 'number-and-name')"
          />
          {{ t('export-headings-both') }}
        </label>
        <label class="check">
          <input
            type="radio"
            name="export-headings"
            :checked="choices.headings === 'name'"
            data-testid="export-headings-name"
            @change="set('headings', 'name')"
          />
          {{ t('export-headings-name') }}
        </label>
      </fieldset>

      <section v-if="paged" class="export-group">
        <h3 class="group-label">{{ t('export-look') }}</h3>
        <label class="check">
          <input
            type="checkbox"
            :checked="choices.doubleSpaced"
            data-testid="export-double"
            @change="set('doubleSpaced', ($event.target as HTMLInputElement).checked)"
          />
          {{ t('export-double') }}
        </label>
        <label class="field inline">
          {{ t('export-paper') }}
          <select
            :value="choices.paper"
            data-testid="export-paper"
            @change="set('paper', ($event.target as HTMLSelectElement).value as 'a4' | 'letter')"
          >
            <option value="a4">{{ t('export-paper-a4') }}</option>
            <option value="letter">{{ t('export-paper-letter') }}</option>
          </select>
        </label>
      </section>

      <section v-if="choices.format === 'epub'" class="export-group">
        <h3 class="group-label">{{ t('export-cover') }}</h3>
        <p v-if="coverName" :class="coverMissing ? 'warning' : 'secondary'" data-testid="export-cover-name">
          <template v-if="coverMissing">⚠ {{ t('export-cover-missing', coverName) }}</template>
          <bdi v-else dir="ltr">{{ coverName }}</bdi>
        </p>
        <div class="actions start">
          <button type="button" data-testid="export-choose-cover" @click="chooseCover">{{ t('export-cover-choose') }}</button>
          <button v-if="coverName" type="button" class="link" data-testid="export-remove-cover" @click="removeCover">
            {{ t('export-cover-remove') }}
          </button>
          <span v-else class="secondary">{{ t('export-cover-optional') }}</span>
        </div>
      </section>

      <p v-if="info.unreadable.length > 0" class="warning" role="status" data-testid="export-unreadable">
        ⚠ {{ t('export-unreadable', info.unreadable.map((chapter) => chapter.title).join(', ')) }}
      </p>

      <p class="secondary export-saves-as">{{ t('export-saves-as', savesAs) }}</p>
      <div class="actions">
        <button type="button" data-testid="export-cancel" @click="close">{{ t('prompt-cancel') }}</button>
        <button type="submit" class="primary" :disabled="noneChosen || busy" data-testid="export-go">{{ t('export-go') }}</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.export-dialog {
  inline-size: min(30rem, calc(100vw - 2rem));
}
.export-dialog form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.export-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: none;
  margin: 0;
  padding: 0;
}
.export-formats {
  display: flex;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.field.inline {
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
}
.export-chooser {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-inline-start: 1.6rem;
}
.export-chapter-list {
  list-style: none;
  margin: 0;
  padding: 0.4rem;
  max-block-size: 12rem;
  overflow-y: auto;
  background: var(--color-page);
  border-radius: 10px;
}
.export-part {
  display: block;
  margin-block: 0.4rem 0.1rem;
}
.link {
  border: none;
  background: none;
  padding: 0;
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.link:hover:not(:disabled) {
  background: none;
}
.export-saves-as {
  text-align: end;
  margin: 0;
}
p {
  margin: 0;
}
</style>
