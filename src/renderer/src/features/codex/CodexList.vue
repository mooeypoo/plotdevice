<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CodexKindDto, CodexListingDto, SettableTypeDto } from '../../../../contract/dtos'
import NewEntryInput from '../binder/NewEntryInput.vue'
import { codexSections, entryDetail } from './codex-sections'

const props = defineProps<{
  listing: CodexListingDto
  selectedPath: string | null
  readOnly: boolean
}>()

const emit = defineEmits<{
  open: [path: string]
  create: [kind: CodexKindDto, title: string]
  setType: [path: string, type: SettableTypeDto]
  editTemplate: [kind: CodexKindDto]
  createOutline: [title: string]
}>()

const sections = computed(() => codexSections(props.listing))
const adding = ref<CodexKindDto | null>(null)
const addingOutline = ref(false)

function createOutline(title: string): void {
  addingOutline.value = false
  emit('createOutline', title)
}
const TEMPLATE_NAMES: Readonly<Record<CodexKindDto, string>> = {
  character: 'New character',
  location: 'New location',
  note: 'New note'
}
const TYPES: readonly SettableTypeDto[] = ['character', 'location', 'note', 'chapter', 'part']

function create(kind: CodexKindDto, title: string): void {
  adding.value = null
  emit('create', kind, title)
}

function chooseType(path: string, event: Event): void {
  const select = event.target as HTMLSelectElement
  const type = TYPES.find((candidate) => candidate === select.value)
  select.value = ''
  if (type !== undefined) emit('setType', path, type)
}
</script>

<template>
  <div class="codex">
    <section class="section">
      <div class="divider">
        <h2 class="eyebrow">Outlines</h2>
        <span class="rule" aria-hidden="true"></span>
        <span class="count">{{ listing.outlines.length }}</span>
      </div>
      <ul>
        <li v-for="outline in listing.outlines" :key="outline.path">
          <button
            type="button"
            class="row"
            :class="{ active: selectedPath === outline.path }"
            :aria-current="selectedPath === outline.path ? 'true' : undefined"
            @click="$emit('open', outline.path)"
          >
            <span class="title" dir="auto">{{ outline.title }}</span>
          </button>
        </li>
      </ul>
      <NewEntryInput
        v-if="addingOutline"
        placeholder="Outline’s name"
        @create="createOutline"
        @cancel="addingOutline = false"
      />
      <button v-else-if="!readOnly" type="button" class="new" @click="addingOutline = true">
        + New outline
      </button>
    </section>

    <section v-for="section in sections" :key="section.kind" class="section">
      <div class="divider">
        <h2 class="eyebrow">{{ section.heading }}</h2>
        <span class="rule" aria-hidden="true"></span>
        <span class="count">{{ section.entries.length }}</span>
      </div>
      <ul>
        <li v-for="entry in section.entries" :key="entry.path">
          <button
            type="button"
            class="row"
            :class="{ active: selectedPath === entry.path }"
            :aria-current="selectedPath === entry.path ? 'true' : undefined"
            @click="$emit('open', entry.path)"
          >
            <span class="title" dir="auto">{{ entry.title }}</span>
            <span v-if="entryDetail(entry)" class="meta" dir="auto">{{ entryDetail(entry) }}</span>
          </button>
        </li>
      </ul>
      <NewEntryInput
        v-if="adding === section.kind"
        :placeholder="`New ${section.newLabel}’s name`"
        @create="create(section.kind, $event)"
        @cancel="adding = null"
      />
      <button v-else-if="!readOnly" type="button" class="new" @click="adding = section.kind">
        + New {{ section.newLabel }}
      </button>
    </section>

    <section v-if="listing.templates.length > 0 && !readOnly" class="section">
      <div class="divider">
        <h2 class="eyebrow">Templates</h2>
        <span class="rule" aria-hidden="true"></span>
      </div>
      <p class="hint">How new entries start. Edit them like any file.</p>
      <ul>
        <li v-for="template in listing.templates" :key="template.kind">
          <button
            type="button"
            class="row"
            :class="{ active: selectedPath === template.path }"
            @click="$emit('editTemplate', template.kind)"
          >
            <span class="title">{{ TEMPLATE_NAMES[template.kind] }}</span>
            <span class="meta">{{ template.exists ? template.path : 'default' }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="listing.untyped.length > 0" class="section">
      <div class="divider">
        <h2 class="eyebrow">Untyped files</h2>
        <span class="rule" aria-hidden="true"></span>
        <span class="count">{{ listing.untyped.length }}</span>
      </div>
      <p class="hint">
        Files with no type, or one Plot Device doesn’t know. Give them a type to use them.
      </p>
      <ul>
        <li v-for="file in listing.untyped" :key="file.path" class="untyped">
          <span class="path" dir="auto" :title="file.path">{{ file.path }}</span>
          <span v-if="file.rawType" class="meta">type: {{ file.rawType }}</span>
          <select
            v-if="!readOnly"
            :aria-label="`Set the type of ${file.path}`"
            value=""
            @change="chooseType(file.path, $event)"
          >
            <option value="" disabled>Set type…</option>
            <option v-for="type in TYPES" :key="type" :value="type">{{ type }}</option>
          </select>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.codex {
  padding-bottom: 12px;
}

.section {
  margin-bottom: 14px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 8px;
}

h2 {
  margin: 0;
}

.rule {
  flex: 1;
  height: 1px;
  background: var(--line-strong);
}

.count {
  font-size: 11px;
  color: var(--text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 6px 10px 6px 14px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-dim);
  text-align: start;
}

.row:hover:not(.active) {
  background: var(--hover);
  color: var(--text);
}

.row.active {
  background: var(--active);
  color: var(--text-strong);
}

.title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  flex-shrink: 0;
  max-width: 45%;
  overflow: hidden;
  font-size: 11px;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new {
  width: 100%;
  min-height: 30px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  text-align: start;
}

.new:hover {
  color: var(--text);
}

.hint {
  margin: 0 8px 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-muted);
}

.untyped {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding: 6px 10px 6px 14px;
}

.path {
  flex: 1 1 100%;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.untyped select {
  padding: 2px 6px;
  font-size: 12px;
}
</style>
