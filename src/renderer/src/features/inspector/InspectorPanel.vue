<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PropertyChangesDto, StoryDateCheckDto } from '../../../../contract/dtos'
import { useInspectorStore } from '../../app/inspector-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { describeUnorderedReason } from '../binder/binder-labels'
import { linkLabel, namesOfType } from './link-targets'
import LinkPicker from './LinkPicker.vue'
import { usePositionMoves } from './use-position-moves'

const manuscript = useManuscriptStore()
const inspector = useInspectorStore()
const workspace = useWorkspaceStore()

const properties = computed(() => manuscript.properties)
const readOnly = computed(() => workspace.project?.readOnly ?? false)
const busy = ref(false)

// Text fields edit a local draft and save when the writer leaves the field.
const title = ref('')
// A number field's v-model gives a number once the writer types, text before that.
const order = ref<string | number>('')
const orderHint = ref<string | null>(null)
const storyDate = ref('')
const storyTime = ref('')
const synopsis = ref('')
const dateCheck = ref<StoryDateCheckDto | undefined>(undefined)

watch(
  properties,
  (current) => {
    title.value = current?.title ?? ''
    order.value = current?.order ?? ''
    orderHint.value = null
    storyDate.value = current?.storyDate ?? ''
    storyTime.value = current?.storyTime ?? ''
    synopsis.value = current?.synopsis ?? ''
    void checkDate()
  },
  { immediate: true }
)

const linkTargets = computed(() => manuscript.manuscript?.linkTargets ?? [])
const characterNames = computed(() => namesOfType(linkTargets.value, ['character']))
const locationNames = computed(() => namesOfType(linkTargets.value, ['location']))

const statuses = computed(() => inspector.vocabulary?.statuses ?? [])
const statusNotInList = computed(() => {
  const status = properties.value?.status
  return status !== undefined &&
    !statuses.value.some((s) => s.toLowerCase() === status.toLowerCase())
    ? status
    : undefined
})

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
  if (unordered !== undefined) return { reason: describeUnorderedReason(unordered.reason) }
  const part = manuscript.currentPart
  const siblings = part?.chapters ?? book.chapters
  const chapter = siblings.find((item) => item.path === path)
  if (chapter === undefined || !chapter.duplicateOrder) return { partPath: part?.path ?? null }
  const clashes = siblings
    .filter((item) => item.path !== path && item.order === chapter.order)
    .map((item) => `“${item.title}”`)
  return {
    partPath: part?.path ?? null,
    clash: `Shares order ${String(chapter.order)} with ${clashes.join(', ')}.`
  }
})

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
    orderHint.value = 'Order must be a whole number.'
    return
  }
  orderHint.value = null
  void save({ order: value })
}

function saveStatus(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
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

async function checkDate(): Promise<void> {
  dateCheck.value =
    storyDate.value.trim() === '' ? undefined : await inspector.checkStoryDate(storyDate.value)
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
const disabled = computed(() => readOnly.value || busy.value || manuscript.saveState === 'missing')

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

function changePart(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  if (value !== '') void run(() => moves.moveToPart(value))
}

const renameOffer = computed(() => {
  const pending = manuscript.pendingRename
  return pending !== null && pending.path === properties.value?.path ? pending.plan : null
})

const renameQuestion = computed(() => {
  const plan = renameOffer.value
  if (plan === null) return ''
  const links =
    plan.linkCount === 0
      ? ''
      : ` This also updates ${String(plan.linkCount)} ${plan.linkCount === 1 ? 'link' : 'links'} in ${String(plan.fileCount)} ${plan.fileCount === 1 ? 'file' : 'files'}.`
  return `Rename the file to “${plan.newName}”?${links}`
})

function acceptRename(): void {
  const path = manuscript.pendingRename?.path
  if (path !== undefined) void run(() => manuscript.renameEntry(path))
}

/** The part's own title when the link resolves; otherwise the link as written. */
const partName = computed(() => {
  const part = properties.value?.part
  if (part === undefined) return '—'
  return manuscript.currentPart?.title ?? linkLabel(part)
})
</script>

<template>
  <aside class="inspector" aria-label="Inspector">
    <template v-if="properties">
      <header>
        <span class="eyebrow">{{ properties.kind === 'part' ? 'Part' : 'Chapter' }}</span>
      </header>

      <section class="position" aria-label="Position">
        <dl>
          <div v-if="properties.kind === 'chapter'">
            <dt>
              <label v-if="partOptions.length > 0 && !readOnly" for="inspector-part">Part</label>
              <template v-else>Part</template>
            </dt>
            <dd v-if="partOptions.length > 0 && !readOnly">
              <select
                id="inspector-part"
                class="part-select"
                dir="auto"
                :value="manuscript.currentPart?.path ?? ''"
                :disabled="disabled"
                @change="changePart"
              >
                <option v-if="manuscript.currentPart === undefined" value="">{{ partName }}</option>
                <option v-for="option in partOptions" :key="option.path" :value="option.path">
                  {{ option.title }}
                </option>
              </select>
            </dd>
            <dd v-else dir="auto">{{ partName }}</dd>
          </div>
          <div>
            <dt><label for="inspector-order">Order</label></dt>
            <dd>
              <input
                id="inspector-order"
                v-model="order"
                class="order"
                type="number"
                step="1"
                :placeholder="properties.order === undefined ? 'none' : ''"
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
            :title="`Move this ${properties.kind} up one place`"
            @click="run(moves.moveUp)"
          >
            ↑ Move up
          </button>
          <button
            type="button"
            class="quiet small"
            :disabled="disabled || !canMoveDown"
            :title="`Move this ${properties.kind} down one place`"
            @click="run(moves.moveDown)"
          >
            ↓ Move down
          </button>
        </div>
        <button
          v-if="properties.kind === 'chapter' && properties.order !== undefined"
          type="button"
          class="quiet small"
          :disabled="disabled"
          title="Removes this chapter's order; it moves to the Unordered tray. The file stays."
          @click="save({ order: null })"
        >
          Remove from manuscript
        </button>
        <p v-if="placement && 'reason' in placement" class="note">
          Not in the book yet: {{ placement.reason }}.
        </p>
        <div v-if="placement && 'clash' in placement" class="note warn">
          <p>{{ placement.clash }}</p>
          <button type="button" :disabled="disabled" @click="renumber">Renumber this part</button>
        </div>
      </section>

      <div class="field">
        <label class="eyebrow" for="inspector-title">Title</label>
        <input
          id="inspector-title"
          v-model="title"
          type="text"
          dir="auto"
          :placeholder="`${manuscript.entry?.title ?? ''} (from the file name)`"
          :disabled="disabled"
          @change="saveText('title', title)"
        />
        <div v-if="renameOffer" class="note" role="status">
          <p dir="auto">{{ renameQuestion }}</p>
          <div class="choices">
            <button type="button" class="primary" :disabled="disabled" @click="acceptRename">
              Rename file
            </button>
            <button type="button" :disabled="disabled" @click="manuscript.dismissRename()">
              Keep the name
            </button>
          </div>
        </div>
      </div>

      <div v-if="properties.kind === 'chapter'" class="field">
        <label class="eyebrow" for="inspector-status">Status</label>
        <select
          id="inspector-status"
          :value="properties.status ?? ''"
          :disabled="disabled"
          @change="saveStatus"
        >
          <option value="">No status</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          <option v-if="statusNotInList" :value="statusNotInList">
            {{ statusNotInList }} (not in your list)
          </option>
        </select>
        <button
          v-if="statusNotInList"
          type="button"
          class="quiet small"
          :disabled="disabled"
          @click="inspector.addStatus(statusNotInList)"
        >
          Add “{{ statusNotInList }}” to the project’s statuses
        </button>
      </div>

      <template v-if="properties.kind === 'chapter'">
        <LinkPicker
          label="Point of view"
          :links="properties.pov"
          :suggestions="characterNames"
          single
          :disabled="disabled"
          @change="save({ pov: $event })"
        />
        <LinkPicker
          label="Characters"
          :links="properties.characters"
          :suggestions="characterNames"
          :disabled="disabled"
          @change="save({ characters: $event })"
        />
        <LinkPicker
          label="Location"
          :links="properties.location"
          :suggestions="locationNames"
          :disabled="disabled"
          @change="save({ location: $event })"
        />

        <div v-if="threads.length > 0" class="field">
          <span class="eyebrow">Threads</span>
          <div class="threads" role="group" aria-label="Threads">
            <button
              v-for="thread in threads"
              :key="thread.key"
              type="button"
              class="thread"
              :class="{ on: properties.threads.includes(thread.key) }"
              :aria-pressed="properties.threads.includes(thread.key)"
              :disabled="disabled"
              :title="thread.unknown ? 'Not defined in novel.md' : thread.key"
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

        <div class="field">
          <label class="eyebrow" for="inspector-date">Story date</label>
          <input
            id="inspector-date"
            v-model="storyDate"
            type="text"
            :placeholder="
              inspector.vocabulary?.calendar === 'day-count' ? 'Day, for example 14' : 'YYYY-MM-DD'
            "
            :disabled="disabled"
            @input="checkDate"
            @change="saveDate"
          />
          <p
            v-if="dateCheck && dateCheck.kind !== 'undated'"
            class="hint"
            :class="{ bad: dateCheck.kind === 'invalid' }"
            aria-live="polite"
          >
            {{ dateCheck.kind === 'invalid' ? dateCheck.message : dateCheck.description }}
          </p>
        </div>

        <div class="field">
          <label class="eyebrow" for="inspector-time">Story time</label>
          <input
            id="inspector-time"
            v-model="storyTime"
            type="text"
            dir="auto"
            placeholder="Evening, the next morning…"
            :disabled="disabled"
            @change="saveText('storyTime', storyTime)"
          />
        </div>
      </template>

      <div class="field">
        <label class="eyebrow" for="inspector-synopsis">Synopsis</label>
        <textarea
          id="inspector-synopsis"
          v-model="synopsis"
          rows="5"
          dir="auto"
          :disabled="disabled"
          @change="saveText('synopsis', synopsis)"
        ></textarea>
      </div>

      <p v-if="manuscript.actionError" class="note warn" role="alert">
        {{ manuscript.actionError }}
      </p>
      <p v-if="readOnly" class="note">This project is open read-only.</p>
    </template>
    <p v-else class="empty">Open a chapter to see its details.</p>
  </aside>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 16px 18px 40px;
  border-inline-start: 1px solid var(--line);
  background: var(--panel);
}

.position dl {
  display: flex;
  gap: 24px;
  margin: 0;
}

.position dt {
  font-size: 11px;
  color: var(--text-muted);
}

.position dd {
  margin: 2px 0 0;
  color: var(--text);
}

.position .order {
  width: 72px;
  padding: 4px 8px;
}

.position .small {
  margin-top: 8px;
}

.position .part-select {
  max-width: 150px;
  padding: 3px 6px;
}

.moves {
  display: flex;
  gap: 4px;
}

.choices {
  display: flex;
  gap: 6px;
}

.note {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--raised);
  color: var(--text-dim);
  line-height: 1.45;
}

.note p {
  margin: 0 0 8px;
}

.note.warn {
  background: var(--accent-soft);
  color: var(--text);
}

:deep(.field) {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

:deep(input),
select,
textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 13px;
}

textarea {
  resize: vertical;
  font-family: var(--font-prose);
  font-size: 14px;
  line-height: 1.5;
}

.small {
  align-self: flex-start;
  padding: 4px 6px;
  font-size: 12px;
}

.threads {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.thread {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-muted);
}

.thread.on {
  border-color: var(--accent);
  color: var(--text);
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--ok);
}

.hint.bad {
  color: var(--danger);
}

.empty {
  color: var(--text-muted);
}
</style>
