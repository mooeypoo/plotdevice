<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { BoardBeatDto, LinkTargetDto } from '../../../../contract/dtos'
import { useUiLanguageStore } from '../../app/ui-language-store'
import MenuButton from '../../shared/MenuButton.vue'
import type { MenuItem } from '../../shared/menu-item'
import type { LinkAt } from '../../shared/link-at'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import SelectField from '../../shared/SelectField.vue'
import type { SelectOption } from '../../shared/select-option'
import type { ScreenRect } from '../../shared/screen-rect'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import type { BeatEdit } from './beat-edit'

const props = defineProps<{
  beat: BoardBeatDto
  threads: ReadonlyMap<string, { readonly name: string; readonly color?: string }>
  linkTargets: readonly LinkTargetDto[]
  menu: readonly MenuItem[]
  editing: BeatEdit | null
  /** The project's statuses, for a linked chapter's status. */
  statuses: readonly string[]
}>()
const emit = defineEmits<{
  openLink: [link: LinkAt]
  peek: [link: LinkAt, near: ScreenRect, byKeyboard: boolean]
  peekEnd: []
  save: [edit: BeatEdit, value: string]
  cancel: []
}>()

const language = useUiLanguageStore()
const chrome = useChromePresentation()
const draft = ref('')
const field = useTemplateRef<HTMLInputElement | HTMLTextAreaElement>('field')
const statusField = useTemplateRef<InstanceType<typeof SelectField>>('statusField')

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

/** The statuses to choose from: the project's, and the chapter's own if it isn't one of them. */
const statusChoices = (): SelectOption[] => {
  const own = props.beat.chapter?.status
  const statuses =
    own === undefined || props.statuses.includes(own) ? props.statuses : [...props.statuses, own]
  return statuses.map((status) => ({ value: status, label: status }))
}

function startDraft(edit: BeatEdit | null): void {
  if (edit === null) return
  draft.value =
    edit === 'title'
      ? props.beat.title
      : edit === 'notes'
        ? props.beat.notes
        : edit === 'synopsis'
          ? (props.beat.chapter?.synopsis ?? '')
          : (props.beat.chapter?.status ?? '')
  void nextTick(() => {
    statusField.value?.focus()
    field.value?.focus()
    if (field.value instanceof HTMLInputElement) field.value.select()
  })
}

watch(() => props.editing, startDraft)
onMounted(() => {
  startDraft(props.editing)
})

function keydown(event: KeyboardEvent): void {
  if (props.editing === null) return
  event.stopPropagation()
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
  } else if (
    event.key === 'Enter' &&
    (props.editing === 'title' || event.ctrlKey || event.metaKey)
  ) {
    event.preventDefault()
    emit('save', props.editing, draft.value)
  }
}
</script>

<template>
  <div class="beat-head">
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
    <MenuButton
      v-if="menu.length > 0 && editing === null"
      class="more"
      :label="language.t('board-card-menu')"
      :items="menu"
    />
  </div>

  <input
    v-if="editing === 'title'"
    ref="field"
    v-model="draft"
    class="field"
    type="text"
    dir="auto"
    maxlength="2000"
    :aria-label="language.t('board-title-label')"
    @keydown="keydown"
  />
  <RenderedMarkdown
    v-else
    class="beat-title"
    :text="beat.title"
    :link-targets="linkTargets"
    @open-link="(link) => emit('openLink', link)"
    @peek="(link, near, byKeyboard) => emit('peek', link, near, byKeyboard)"
    @peek-end="emit('peekEnd')"
  />

  <template v-if="beat.chapter">
    <SelectField
      v-if="editing === 'status'"
      ref="statusField"
      class="field"
      size="small"
      :model-value="beat.chapter.status ?? ''"
      :options="statusChoices()"
      :aria-label="language.t('board-status-label', beat.chapter.title)"
      @update:model-value="emit('save', 'status', $event)"
      @keydown="keydown"
    />
    <p v-else class="facts" dir="auto">{{ facts(beat) }}</p>
    <p v-if="beat.chapter.synopsis && editing !== 'synopsis'" class="synopsis" dir="auto">
      {{ beat.chapter.synopsis }}
    </p>
  </template>

  <div v-if="editing === 'notes' || editing === 'synopsis'" class="area">
    <textarea
      ref="field"
      v-model="draft"
      class="field"
      dir="auto"
      rows="4"
      :aria-label="
        editing === 'notes'
          ? language.t('board-notes-label')
          : language.t('board-synopsis-label', beat.chapter?.title ?? '')
      "
      @keydown="keydown"
    ></textarea>
    <div class="actions">
      <button type="button" class="primary small" @click="emit('save', editing, draft)">
        {{ language.t('board-save') }}
      </button>
      <button type="button" class="quiet small" @click="emit('cancel')">
        {{ language.t('board-cancel') }}
      </button>
    </div>
  </div>
  <p v-else-if="firstNote(beat) !== ''" class="notes" dir="auto">{{ firstNote(beat) }}</p>
</template>

<style scoped>
.beat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
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
  padding-inline: 6px;
  border-inline-start: 3px solid var(--thread-color);
  color: var(--text-muted);
  font-size: 11px;
}

.facts,
.notes,
.synopsis {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.notes {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.synopsis {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-style: italic;
}

.field {
  width: 100%;
  padding-block: 4px;
  padding-inline: 6px;
  font: inherit;
}

.area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.actions {
  display: flex;
  gap: 6px;
}

.more {
  opacity: 0;
}
</style>
