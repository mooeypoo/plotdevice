<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PropertyChangesDto } from '../../../../contract/dtos'
import { useInspectorStore } from '../../app/inspector-store'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { clashDescription, describeUnorderedReason } from '../../shared/manuscript-labels'
import { linkLabel, namesOfType } from './link-targets'
import LinkPicker from './LinkPicker.vue'
import RenameOffer from './RenameOffer.vue'
import { usePositionMoves } from './use-position-moves'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'
import SelectField from '../../shared/SelectField.vue'
import type { SelectOption } from '../../shared/select-option'
import { formatStoryDateReading } from '../../shared/story-date-format'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { useStoryDateCheck } from './use-story-date-check'

const manuscript = useManuscriptStore()
const editor = useEditorStore()
const inspector = useInspectorStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()

const properties = computed(() => manuscript.properties)
const readOnly = computed(() => workspace.project?.readOnly ?? false)
const busy = ref(false)

// Text fields edit a local draft and save when the writer leaves the field.
const title = ref('')
// A number field's v-model gives a number once the writer types, text before that.
const order = ref<string | number>('')
const invalidOrder = ref(false)
const orderHint = computed(() =>
  invalidOrder.value ? language.t('placement-order-invalid') : null
)
const storyDate = ref('')
const storyTime = ref('')
const synopsis = ref('')

watch(
  properties,
  (current) => {
    title.value = current?.title ?? ''
    order.value = current?.order ?? ''
    invalidOrder.value = false
    storyDate.value = current?.storyDate ?? ''
    storyTime.value = current?.storyTime ?? ''
    synopsis.value = current?.synopsis ?? ''
  },
  { immediate: true }
)

const { reading: dateCheck, error: dateCheckError } = useStoryDateCheck(
  () => storyDate.value,
  () => properties.value?.path
)

/**
 * Details stays compact while drafting (F7): placement and story time fold away, and empty
 * characters and place wait behind one quiet "+ Add". A problem in a group opens it.
 */
const placementOpen = ref(false)
const storyTimeOpen = ref(false)
const castShown = ref(false)
const castEmpty = computed(
  () =>
    properties.value?.kind === 'chapter' &&
    properties.value.characters.length === 0 &&
    properties.value.location.length === 0
)
watch(
  () => properties.value?.path,
  () => {
    castShown.value = false
  }
)
watch(
  () => dateCheckError.value !== null || dateCheck.value?.kind === 'invalid',
  (problem) => {
    if (problem) storyTimeOpen.value = true
  },
  { immediate: true }
)
const storySummary = computed(() =>
  [properties.value?.storyDate, properties.value?.storyTime]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ')
)

const linkTargets = computed(() => manuscript.manuscript?.linkTargets ?? [])
const characterNames = computed(() =>
  namesOfType(linkTargets.value, ['character'], chrome.compareText)
)
const locationNames = computed(() =>
  namesOfType(linkTargets.value, ['location'], chrome.compareText)
)

const statuses = computed(() => inspector.vocabulary?.statuses ?? [])
const statusNotInList = computed(() => {
  const status = properties.value?.status
  return status !== undefined &&
    !statuses.value.some((s) => s.toLowerCase() === status.toLowerCase())
    ? status
    : undefined
})
const statusChoices = computed((): SelectOption[] => [
  { value: '', label: language.t('binder-no-status') },
  ...statuses.value.map((status) => ({ value: status, label: status })),
  ...(statusNotInList.value === undefined
    ? []
    : [
        {
          value: statusNotInList.value,
          label: language.t('inspector-status-not-in-list', isolate(statusNotInList.value))
        }
      ])
])

const threads = computed(() => {
  const known = inspector.vocabulary?.threads ?? []
  const unknown = (properties.value?.threads ?? [])
    .filter((key) => !known.some((thread) => thread.key === key))
    .map((key) => ({ key, name: key, color: undefined, unknown: true }))
  return [...known.map((thread) => ({ ...thread, unknown: false })), ...unknown]
})

/** The chapter as the binder sees it: its part, order clashes, or why it is unordered. */
const placement = computed(() => {
  const path = properties.value?.path
  const book = manuscript.manuscript
  if (path === undefined || book === null) return undefined
  const unordered = book.unordered.find((item) => item.chapter.path === path)
  if (unordered !== undefined)
    return {
      reason: language.t(
        'placement-not-in-book',
        describeUnorderedReason(unordered.reason, language.t)
      )
    }
  const part = manuscript.currentPart
  const siblings = part?.chapters ?? book.chapters
  const chapter = siblings.find((item) => item.path === path)
  if (chapter === undefined || !chapter.duplicateOrder) return { partPath: part?.path ?? null }
  return {
    partPath: part?.path ?? null,
    clash: clashDescription(chapter, siblings, language.t)
  }
})

watch(
  () =>
    orderHint.value !== null ||
    (placement.value !== undefined && ('clash' in placement.value || 'reason' in placement.value)),
  (problem) => {
    if (problem) placementOpen.value = true
  },
  { immediate: true }
)

async function save(changes: PropertyChangesDto): Promise<void> {
  busy.value = true
  try {
    await manuscript.updateProperties(changes)
  } finally {
    busy.value = false
  }
}

function saveText(field: 'title' | 'storyTime' | 'synopsis', value: string): void {
  const before = properties.value?.[field] ?? ''
  if (value.trim() !== before.trim()) void save({ [field]: value })
}

function saveOrder(): void {
  const text = String(order.value).trim()
  if (text === (properties.value?.order ?? '')) return
  if (text === '') {
    void save({ order: null })
    return
  }
  const value = Number(text)
  if (!Number.isInteger(value)) {
    invalidOrder.value = true
    return
  }
  invalidOrder.value = false
  void save({ order: value })
}

function saveStatus(value: string): void {
  if (value !== (properties.value?.status ?? '')) void save({ status: value })
}

function toggleThread(key: string): void {
  const current = properties.value?.threads ?? []
  void save({
    threads: current.includes(key)
      ? current.filter((existing) => existing !== key)
      : [...current, key]
  })
}

function saveDate(): void {
  if (storyDate.value.trim() !== (properties.value?.storyDate ?? '').trim()) {
    void save({ storyDate: storyDate.value })
  }
}

async function renumber(): Promise<void> {
  const target = placement.value
  if (target === undefined || !('partPath' in target)) return
  busy.value = true
  try {
    await manuscript.renumberPart(target.partPath ?? null)
  } finally {
    busy.value = false
  }
}

// A file that vanished can't take property changes; its banner offers what can be done.
const disabled = computed(() => readOnly.value || busy.value || editor.saveState === 'missing')

const moves = usePositionMoves()
const { canMoveUp, canMoveDown, partOptions } = moves

async function run(action: () => Promise<unknown>): Promise<void> {
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}

function changePart(value: string): void {
  if (value !== '') void run(() => moves.moveToPart(value))
}

const partChoices = computed((): SelectOption[] => [
  ...(manuscript.currentPart === undefined ? [{ value: '', label: partName.value }] : []),
  ...partOptions.value.map((option) => ({ value: option.path, label: option.title }))
])

function kindLabel(kind: 'part' | 'chapter'): string {
  return language.t(kind === 'part' ? 'inspector-part' : 'inspector-chapter')
}

function moveTitle(direction: 'up' | 'down', kind: 'part' | 'chapter'): string {
  const label = kindLabel(kind)
  return direction === 'up'
    ? language.t('inspector-move-up', label)
    : language.t('inspector-move-down', label)
}

/** The part's own title when the link resolves; otherwise the link as written. */
const partName = computed(() => {
  const part = properties.value?.part
  if (part === undefined) return '—'
  return manuscript.currentPart?.title ?? linkLabel(part)
})
const placementSummary = computed(() => {
  const current = properties.value
  if (current === null) return ''
  const order =
    current.order === undefined ? '' : `${language.t('inspector-order')} ${current.order}`
  const part = current.kind === 'chapter' ? (manuscript.currentPart?.title ?? '') : ''
  return [part, order].filter((piece) => piece !== '').join(' · ')
})
</script>

<template>
  <aside class="inspector" :aria-label="language.t('inspector-label')">
    <p v-if="inspector.vocabularyError" class="hint bad" role="alert">
      {{ inspector.vocabularyError }}
    </p>
    <template v-if="properties">
      <header>
        <span class="eyebrow">{{ kindLabel(properties.kind) }}</span>
      </header>

      <div class="field">
        <label class="eyebrow" for="inspector-title">{{ language.t('inspector-title') }}</label>
        <input
          id="inspector-title"
          v-model="title"
          type="text"
          dir="auto"
          :placeholder="
            language.t('inspector-title-placeholder', isolate(editor.entry?.title ?? ''))
          "
          :disabled="disabled"
          @change="saveText('title', title)"
        />
        <RenameOffer :disabled="disabled" />
      </div>

      <div v-if="properties.kind === 'chapter'" class="field">
        <label class="eyebrow" for="inspector-status">{{ language.t('inspector-status') }}</label>
        <SelectField
          id="inspector-status"
          :model-value="properties.status ?? ''"
          :options="statusChoices"
          :disabled="disabled"
          @update:model-value="saveStatus"
        />
        <button
          v-if="statusNotInList"
          type="button"
          class="quiet small"
          :disabled="disabled"
          @click="inspector.addStatus(statusNotInList)"
        >
          {{ language.t('inspector-add-status', isolate(statusNotInList)) }}
        </button>
        <p v-if="inspector.error" role="alert">{{ inspector.error }}</p>
      </div>

      <template v-if="properties.kind === 'chapter'">
        <LinkPicker
          :label="language.t('inspector-pov')"
          :links="properties.pov"
          :suggestions="characterNames"
          single
          :disabled="disabled"
          @change="save({ pov: $event })"
        />
        <template v-if="castShown || !castEmpty">
          <LinkPicker
            :label="language.t('inspector-characters')"
            :links="properties.characters"
            :suggestions="characterNames"
            :disabled="disabled"
            @change="save({ characters: $event })"
          />
          <LinkPicker
            :label="language.t('inspector-location')"
            :links="properties.location"
            :suggestions="locationNames"
            :disabled="disabled"
            @change="save({ location: $event })"
          />
        </template>
        <button
          v-else
          type="button"
          class="quiet small add-cast"
          :disabled="disabled"
          @click="castShown = true"
        >
          {{ language.t('inspector-add-cast') }}
        </button>

        <div v-if="threads.length > 0" class="field">
          <span class="eyebrow">{{ language.t('inspector-threads') }}</span>
          <div class="threads" role="group" :aria-label="language.t('inspector-threads')">
            <button
              v-for="thread in threads"
              :key="thread.key"
              type="button"
              class="thread"
              dir="auto"
              :class="{ on: properties.threads.includes(thread.key) }"
              :aria-pressed="properties.threads.includes(thread.key)"
              :disabled="disabled"
              :title="thread.unknown ? language.t('inspector-thread-unknown') : isolate(thread.key)"
              @click="toggleThread(thread.key)"
            >
              <span
                class="swatch"
                :style="{ background: thread.color ?? 'var(--text-muted)' }"
              ></span>
              {{ thread.name }}
            </button>
          </div>
        </div>
      </template>

      <div class="field">
        <label class="eyebrow" for="inspector-synopsis">
          {{ language.t('inspector-synopsis') }}
        </label>
        <textarea
          id="inspector-synopsis"
          v-model="synopsis"
          rows="5"
          dir="auto"
          :disabled="disabled"
          @change="saveText('synopsis', synopsis)"
        ></textarea>
      </div>

      <details
        class="group"
        :open="placementOpen"
        @toggle="placementOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary>
          <span class="eyebrow">{{ language.t('inspector-position') }}</span>
          <span class="summary" dir="auto">{{ placementSummary }}</span>
        </summary>
        <section class="position" :aria-label="language.t('inspector-position')">
          <dl>
            <div v-if="properties.kind === 'chapter'">
              <dt>
                <label v-if="partOptions.length > 0 && !readOnly" for="inspector-part">
                  {{ language.t('inspector-part') }}
                </label>
                <template v-else>{{ language.t('inspector-part') }}</template>
              </dt>
              <dd v-if="partOptions.length > 0 && !readOnly">
                <SelectField
                  id="inspector-part"
                  class="part-select"
                  size="small"
                  :model-value="manuscript.currentPart?.path ?? ''"
                  :options="partChoices"
                  :disabled="disabled"
                  @update:model-value="changePart"
                />
              </dd>
              <dd v-else dir="auto">{{ partName }}</dd>
            </div>
            <div>
              <dt>
                <label for="inspector-order">{{ language.t('inspector-order') }}</label>
              </dt>
              <dd>
                <input
                  id="inspector-order"
                  v-model="order"
                  class="order"
                  type="number"
                  step="1"
                  :placeholder="
                    properties.order === undefined ? language.t('inspector-no-order') : ''
                  "
                  :disabled="disabled"
                  @change="saveOrder"
                />
              </dd>
            </div>
          </dl>
          <p v-if="orderHint" class="hint bad">{{ orderHint }}</p>
          <div v-if="!readOnly && (canMoveUp || canMoveDown)" class="moves">
            <button
              type="button"
              class="quiet small"
              :disabled="disabled || !canMoveUp"
              :title="moveTitle('up', properties.kind)"
              @click="run(moves.moveUp)"
            >
              ↑ {{ language.t('inspector-move-up-label') }}
            </button>
            <button
              type="button"
              class="quiet small"
              :disabled="disabled || !canMoveDown"
              :title="moveTitle('down', properties.kind)"
              @click="run(moves.moveDown)"
            >
              ↓ {{ language.t('inspector-move-down-label') }}
            </button>
          </div>
          <button
            v-if="properties.kind === 'chapter' && properties.order !== undefined"
            type="button"
            class="quiet small"
            :disabled="disabled"
            :title="language.t('inspector-remove-order-tooltip')"
            @click="save({ order: null })"
          >
            {{ language.t('inspector-remove-order') }}
          </button>
          <p v-if="placement && 'reason' in placement" class="note">
            {{ placement.reason }}
          </p>
          <div v-if="placement && 'clash' in placement" class="note warn">
            <p>{{ placement.clash }}</p>
            <button type="button" :disabled="disabled" @click="renumber">
              {{ language.t('inspector-renumber-part') }}
            </button>
          </div>
        </section>
      </details>

      <details
        v-if="properties.kind === 'chapter'"
        class="group"
        :open="storyTimeOpen"
        @toggle="storyTimeOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary>
          <span class="eyebrow">{{ language.t('inspector-story-when') }}</span>
          <span class="summary" dir="auto">{{ storySummary }}</span>
        </summary>
        <div class="field">
          <label class="eyebrow" for="inspector-date">
            {{ language.t('inspector-story-date') }}
          </label>
          <input
            id="inspector-date"
            v-model="storyDate"
            type="text"
            :placeholder="
              inspector.vocabulary?.calendar === 'day-count'
                ? language.t('inspector-day-count-placeholder', chrome.formatNumber(14))
                : 'YYYY-MM-DD'
            "
            :disabled="disabled"
            @change="saveDate"
          />
          <p v-if="dateCheckError" class="hint bad" role="alert">{{ dateCheckError }}</p>
          <p
            v-if="dateCheck && dateCheck.kind !== 'undated'"
            class="hint"
            :class="{ bad: dateCheck.kind === 'invalid' }"
            aria-live="polite"
          >
            {{ formatStoryDateReading(dateCheck, language.t) }}
          </p>
        </div>

        <div class="field">
          <label class="eyebrow" for="inspector-time">
            {{ language.t('inspector-story-time') }}
          </label>
          <input
            id="inspector-time"
            v-model="storyTime"
            type="text"
            dir="auto"
            :placeholder="language.t('inspector-story-time-placeholder')"
            :disabled="disabled"
            @change="saveText('storyTime', storyTime)"
          />
        </div>
      </details>

      <p v-if="editor.actionError" class="note warn" role="alert">
        {{ editor.actionError }}
      </p>
      <p v-if="readOnly" class="note">{{ language.t('inspector-read-only') }}</p>
    </template>
    <p v-else class="empty">{{ language.t('inspector-empty') }}</p>
  </aside>
</template>

<style scoped src="./inspector.css"></style>

<style scoped>
.group {
  border-block-start: 1px solid var(--line);
  padding-block-start: var(--space-3);
}

.group summary {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  cursor: pointer;
  list-style-position: outside;
}

.group summary .summary {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group[open] > summary {
  margin-block-end: var(--space-4);
}

.group > .field + .field {
  margin-block-start: var(--space-4);
}

.add-cast {
  align-self: flex-start;
}

.position dl {
  display: flex;
  gap: var(--space-6);
  margin: 0;
}

.position dt {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.position dd {
  margin: var(--space-1) 0 0;
  color: var(--text);
}

.position .order {
  width: 72px;
  padding: var(--space-2) var(--space-3);
}

.position .small {
  margin-top: var(--space-3);
}

.position .part-select {
  max-inline-size: 150px;
}

.moves {
  display: flex;
  gap: var(--space-2);
}

.threads {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.thread {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
  color: var(--text-muted);
}

.thread.on {
  border-color: var(--accent);
  color: var(--text);
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-field);
}
</style>
