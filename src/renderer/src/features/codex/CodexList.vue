<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  CodexKindDto,
  CodexListingDto,
  SettableTypeDto,
  OutlineDto
} from '../../../../contract/dtos'
import NewEntryInput from '../../shared/NewEntryInput.vue'
import SelectField from '../../shared/SelectField.vue'
import { codexSections } from './codex-sections'
import CharacterList from './CharacterList.vue'
import CodexEntryList from './CodexEntryList.vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { isolate } from '../../shared/isolate'

const props = defineProps<{
  listing: CodexListingDto
  outlines: readonly OutlineDto[]
  selectedPath: string | null
  readOnly: boolean
  projectRoot: string
}>()

const emit = defineEmits<{
  open: [path: string]
  edit: [path: string]
  create: [kind: CodexKindDto, title: string]
  setType: [path: string, type: SettableTypeDto]
  editTemplate: [kind: CodexKindDto]
  createOutline: [title: string]
}>()

const sections = computed(() => codexSections(props.listing))
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const adding = ref<CodexKindDto | null>(null)
const addingOutline = ref(false)

function createOutline(title: string): void {
  addingOutline.value = false
  emit('createOutline', title)
}
const SECTION_LABELS = {
  character: 'codex-section-characters',
  location: 'codex-section-locations',
  note: 'codex-section-notes'
} as const
const NEW_ENTRY_LABELS = {
  character: 'codex-new-character',
  location: 'codex-new-location',
  note: 'codex-new-note'
} as const
const NEW_ENTRY_NAMES = {
  character: 'codex-new-character-name',
  location: 'codex-new-location-name',
  note: 'codex-new-note-name'
} as const
const TEMPLATE_NAMES = {
  character: 'codex-template-character',
  location: 'codex-template-location',
  note: 'codex-template-note'
} as const
const TYPES: readonly SettableTypeDto[] = ['character', 'location', 'note', 'chapter', 'part']

function create(kind: CodexKindDto, title: string): void {
  adding.value = null
  emit('create', kind, title)
}

const TYPE_OPTIONS = TYPES.map((type) => ({ value: type, label: type }))

function chooseType(path: string, value: string): void {
  const type = TYPES.find((candidate) => candidate === value)
  if (type !== undefined) emit('setType', path, type)
}
</script>

<template>
  <div class="codex">
    <section class="section">
      <div class="divider">
        <h2 class="eyebrow">{{ language.t('codex-outlines') }}</h2>
        <span class="rule" aria-hidden="true"></span>
        <span class="count">{{ chrome.formatNumber(outlines.length) }}</span>
      </div>
      <ul>
        <li v-for="outline in outlines" :key="outline.path">
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
        :placeholder="language.t('codex-outline-name')"
        @create="createOutline"
        @cancel="addingOutline = false"
      />
      <button v-else-if="!readOnly" type="button" class="new" @click="addingOutline = true">
        + {{ language.t('codex-new-outline') }}
      </button>
    </section>

    <section v-for="section in sections" :key="section.kind" class="section">
      <div class="divider">
        <h2 class="eyebrow">{{ language.t(SECTION_LABELS[section.kind]) }}</h2>
        <span class="rule" aria-hidden="true"></span>
        <span class="count">{{ chrome.formatNumber(section.entries.length) }}</span>
      </div>
      <CharacterList
        v-if="section.kind === 'character'"
        :entries="section.entries"
        :project-root="projectRoot"
        :selected-path="selectedPath"
        @open="$emit('open', $event)"
        @edit="$emit('edit', $event)"
      />
      <CodexEntryList
        v-else
        :entries="section.entries"
        :selected-path="selectedPath"
        @open="$emit('open', $event)"
        @edit="$emit('edit', $event)"
      />
      <NewEntryInput
        v-if="adding === section.kind"
        :placeholder="language.t(NEW_ENTRY_NAMES[section.kind])"
        @create="create(section.kind, $event)"
        @cancel="adding = null"
      />
      <button v-else-if="!readOnly" type="button" class="new" @click="adding = section.kind">
        + {{ language.t(NEW_ENTRY_LABELS[section.kind]) }}
      </button>
    </section>

    <section v-if="listing.templates.length > 0 && !readOnly" class="section">
      <div class="divider">
        <h2 class="eyebrow">{{ language.t('codex-templates') }}</h2>
        <span class="rule" aria-hidden="true"></span>
      </div>
      <p class="hint">{{ language.t('codex-template-hint') }}</p>
      <ul>
        <li v-for="template in listing.templates" :key="template.kind">
          <button
            type="button"
            class="row"
            :class="{ active: selectedPath === template.path }"
            @click="$emit('editTemplate', template.kind)"
          >
            <span class="title">{{ language.t(TEMPLATE_NAMES[template.kind]) }}</span>
            <span class="meta">{{
              template.exists ? template.path : language.t('codex-template-default')
            }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="listing.untyped.length > 0" class="section">
      <div class="divider">
        <h2 class="eyebrow">{{ language.t('codex-untyped-files') }}</h2>
        <span class="rule" aria-hidden="true"></span>
        <span class="count">{{ chrome.formatNumber(listing.untyped.length) }}</span>
      </div>
      <p class="hint">{{ language.t('codex-untyped-hint') }}</p>
      <ul>
        <li v-for="file in listing.untyped" :key="file.path" class="untyped">
          <span class="path" dir="auto" :title="file.path">{{ file.path }}</span>
          <span v-if="file.rawType" class="meta">{{
            language.t('codex-raw-type', isolate(file.rawType))
          }}</span>
          <SelectField
            v-if="!readOnly"
            model-value=""
            :options="TYPE_OPTIONS"
            :placeholder="language.t('codex-set-type')"
            :aria-label="language.t('codex-set-type-label', isolate(file.path))"
            size="small"
            @update:model-value="chooseType(file.path, $event)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.codex {
  padding-bottom: var(--space-4);
}

.section {
  margin-bottom: var(--space-5);
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-3) var(--space-3);
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
  font-size: var(--text-caption);
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
  gap: var(--space-3);
  width: 100%;
  min-height: 32px;
  padding-block: var(--space-3);
  padding-inline: var(--space-5) var(--space-3);
  border: none;
  border-radius: var(--radius-field);
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
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  flex-shrink: 0;
  max-width: 45%;
  overflow: hidden;
  font-size: var(--text-caption);
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new {
  width: 100%;
  min-height: 30px;
  padding: 0 var(--space-5);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-small);
  text-align: start;
}

.new:hover {
  color: var(--text);
}

.hint {
  margin: 0 var(--space-3) var(--space-3);
  font-size: var(--text-small);
  line-height: 1.4;
  color: var(--text-muted);
}

.untyped {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  padding-block: var(--space-3);
  padding-inline: var(--space-5) var(--space-3);
}

.path {
  flex: 1 1 100%;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--text-dim);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.untyped .select-field {
  flex: none;
}
</style>
