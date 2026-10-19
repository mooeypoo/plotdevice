<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PropertyChangesDto, StoryDateCheckDto } from '../../../../contract/dtos'
import { useInspectorStore } from '../../app/inspector-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { describeUnorderedReason } from '../binder/binder-labels'
import { linkLabel, namesOfType } from './link-targets'
import LinkPicker from './LinkPicker.vue'

const manuscript = useManuscriptStore()
const inspector = useInspectorStore()
const workspace = useWorkspaceStore()

const properties = computed(() => manuscript.properties)
const readOnly = computed(() => workspace.project?.readOnly ?? false)
const busy = ref(false)

// Text fields edit a local draft and save when the writer leaves the field.
const title = ref('')
const storyDate = ref('')
const storyTime = ref('')
const synopsis = ref('')
const dateCheck = ref<StoryDateCheckDto | undefined>(undefined)

watch(
  properties,
  (current) => {
    title.value = current?.title ?? ''
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

const disabled = computed(() => readOnly.value || busy.value)

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
            <dt>Part</dt>
            <dd dir="auto">{{ partName }}</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>{{ properties.order ?? '—' }}</dd>
          </div>
        </dl>
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
