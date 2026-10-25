<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CodexChangesDto } from '../../../../contract/dtos'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useInspectorStore } from '../../app/inspector-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { isolate } from '../../shared/isolate'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { formatStoryDateReading } from '../../shared/story-date-format'
import RelationshipsEditor from './RelationshipsEditor.vue'
import RenameOffer from './RenameOffer.vue'
import TextListInput from './TextListInput.vue'
import { characterGroupNames } from '../../shared/character-list'
import { useStoryDateCheck } from './use-story-date-check'

const codex = useCodexStore()
const editor = useEditorStore()
const inspector = useInspectorStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const { formatNumber, compareText } = useChromePresentation()

const properties = computed(() => codex.properties)
const groupNames = computed(() =>
  characterGroupNames(
    (codex.listing?.entries ?? [])
      .filter((entry) => entry.kind === 'character')
      .flatMap((entry) => entry.groups ?? []),
    compareText
  )
)
const busy = ref(false)
// A file that vanished can't take property changes; its banner offers what can be done.
const disabled = computed(
  () => (workspace.project?.readOnly ?? false) || busy.value || editor.saveState === 'missing'
)

const title = ref('')
const role = ref('')
const born = ref('')

watch(
  properties,
  (current) => {
    title.value = current?.title ?? ''
    role.value = current?.role ?? ''
    born.value = current?.born ?? ''
  },
  { immediate: true }
)

const { reading: bornCheck, error: bornCheckError } = useStoryDateCheck(
  () => born.value,
  () => (properties.value?.kind === 'character' ? properties.value.path : undefined)
)

const KIND_KEYS = {
  character: 'entry-place-character',
  location: 'entry-place-location',
  note: 'entry-place-note'
} as const

async function save(changes: CodexChangesDto): Promise<void> {
  busy.value = true
  try {
    await codex.updateProperties(changes)
  } finally {
    busy.value = false
  }
}

function saveText(field: 'title' | 'role' | 'born', value: string): void {
  if (value.trim() !== (properties.value?.[field] ?? '').trim()) void save({ [field]: value })
}

const KEY_KEYS = {
  pov: 'codex-inspector-appears-pov',
  characters: 'codex-inspector-appears-characters',
  location: 'codex-inspector-appears-location'
} as const
</script>

<template>
  <aside class="inspector" :aria-label="language.t('chrome-inspector')">
    <p v-if="inspector.vocabularyError" class="hint bad" role="alert">
      {{ inspector.vocabularyError }}
    </p>
    <template v-if="properties">
      <header>
        <span class="eyebrow">{{ language.t(KIND_KEYS[properties.kind]) }}</span>
      </header>

      <div class="field">
        <label class="eyebrow" for="codex-title">{{
          properties.kind === 'note'
            ? language.t('codex-inspector-title')
            : language.t('codex-inspector-name')
        }}</label>
        <input
          id="codex-title"
          v-model="title"
          type="text"
          dir="auto"
          :placeholder="
            language.t('codex-inspector-title-placeholder', isolate(editor.entry?.title ?? ''))
          "
          :disabled="disabled"
          @change="saveText('title', title)"
        />
        <RenameOffer :disabled="disabled" />
      </div>

      <TextListInput
        v-if="properties.kind !== 'note'"
        :label="language.t('codex-inspector-aliases')"
        :items="properties.aliases"
        :placeholder="language.t('codex-inspector-alias-placeholder')"
        :disabled="disabled"
        @change="save({ aliases: $event })"
      />

      <template v-if="properties.kind === 'character'">
        <TextListInput
          :key="properties.path"
          :label="language.t('codex-inspector-groups')"
          :items="properties.groups ?? []"
          :placeholder="language.t('codex-inspector-group-placeholder')"
          :suggestions="groupNames"
          :disabled="disabled || properties.groupsEditable === false"
          @change="save({ groups: characterGroupNames($event) })"
        />
        <p v-if="properties.groupsEditable === false" class="hint bad" role="alert">
          {{ language.t('codex-inspector-groups-read-only') }}
        </p>
        <div class="field">
          <label class="eyebrow" for="codex-role">{{ language.t('codex-inspector-role') }}</label>
          <input
            id="codex-role"
            v-model="role"
            type="text"
            dir="auto"
            :placeholder="language.t('codex-inspector-role-placeholder')"
            :disabled="disabled"
            @change="saveText('role', role)"
          />
        </div>
        <div class="field">
          <label class="eyebrow" for="codex-born">{{ language.t('codex-inspector-born') }}</label>
          <input
            id="codex-born"
            v-model="born"
            type="text"
            dir="auto"
            :placeholder="
              inspector.vocabulary?.calendar === 'day-count'
                ? language.t('inspector-day-count-placeholder', formatNumber(-4000))
                : language.t('codex-inspector-born-year-placeholder')
            "
            :disabled="disabled"
            @change="saveText('born', born)"
          />
          <p v-if="bornCheckError" class="hint bad" role="alert">{{ bornCheckError }}</p>
          <p
            v-if="bornCheck && bornCheck.kind !== 'undated'"
            class="hint"
            :class="{ bad: bornCheck.kind === 'invalid' }"
            aria-live="polite"
          >
            {{ formatStoryDateReading(bornCheck, language.t) }}
          </p>
        </div>
        <RelationshipsEditor :disabled="disabled" />
      </template>

      <section v-if="properties.kind !== 'note'" class="field">
        <h3 class="eyebrow">{{ language.t('codex-inspector-appears-in') }}</h3>
        <p
          v-if="codex.appearsInError"
          class="hint bad"
          role="alert"
          data-testid="appearances-error"
        >
          {{ codex.appearsInError }}
        </p>
        <ul v-else-if="codex.appearsIn.length > 0" class="plain">
          <li v-for="chapter in codex.appearsIn" :key="chapter.path">
            <button type="button" class="link" dir="auto" @click="editor.open(chapter.path)">
              {{ chapter.title }}
            </button>
            <span class="muted">
              · {{ chapter.keys.map((key) => language.t(KEY_KEYS[key])).join(', ') }}
            </span>
          </li>
        </ul>
        <p v-else class="empty">
          {{ language.t('codex-inspector-appears-empty', isolate(editor.entry?.title ?? '')) }}
        </p>
      </section>

      <section v-if="properties.otherKeys.length > 0" class="field">
        <h3 class="eyebrow">{{ language.t('codex-inspector-other-properties') }}</h3>
        <dl class="others">
          <template v-for="other in properties.otherKeys" :key="other.key">
            <dt dir="auto">{{ other.key }}</dt>
            <dd dir="auto">{{ other.value }}</dd>
          </template>
        </dl>
        <p class="muted small-text">{{ language.t('codex-inspector-other-note') }}</p>
      </section>

      <p v-if="editor.actionError" class="note warn" role="alert">{{ editor.actionError }}</p>
    </template>
  </aside>
</template>

<style scoped src="./inspector.css"></style>
<style scoped>
h3 {
  margin: 0;
}

.plain {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accent);
  text-align: start;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.muted {
  color: var(--text-muted);
}

.small-text {
  margin: var(--space-1) 0 0;
  font-size: var(--text-small);
}

.others {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2) var(--space-4);
  margin: 0;
  font-size: var(--text-body);
}

.others dt {
  color: var(--text-muted);
}

.others dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text);
}
</style>
