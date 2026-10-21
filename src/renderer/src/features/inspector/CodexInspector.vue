<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CodexChangesDto } from '../../../../contract/dtos'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useInspectorStore } from '../../app/inspector-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import RelationshipsEditor from './RelationshipsEditor.vue'
import RenameOffer from './RenameOffer.vue'
import TextListInput from './TextListInput.vue'
import { characterGroupNames } from '../codex/character-list'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { formatStoryDateReading } from '../../shared/story-date-format'
import { useStoryDateCheck } from './use-story-date-check'

const codex = useCodexStore()
const editor = useEditorStore()
const inspector = useInspectorStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()

const properties = computed(() => codex.properties)
const groupNames = computed(() =>
  characterGroupNames(
    (codex.listing?.entries ?? [])
      .filter((entry) => entry.kind === 'character')
      .flatMap((entry) => entry.groups ?? [])
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

const KIND_NAMES = { character: 'Character', location: 'Location', note: 'Note' } as const

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

const KEY_NAMES = { pov: 'point of view', characters: 'characters', location: 'location' } as const
</script>

<template>
  <aside class="inspector" aria-label="Inspector">
    <p v-if="inspector.vocabularyError" class="hint bad" role="alert">
      {{ inspector.vocabularyError }}
    </p>
    <template v-if="properties">
      <header>
        <span class="eyebrow">{{ KIND_NAMES[properties.kind] }}</span>
      </header>

      <div class="field">
        <label class="eyebrow" for="codex-title">{{
          properties.kind === 'note' ? 'Title' : 'Name'
        }}</label>
        <input
          id="codex-title"
          v-model="title"
          type="text"
          dir="auto"
          :placeholder="`${editor.entry?.title ?? ''} (from the file name)`"
          :disabled="disabled"
          @change="saveText('title', title)"
        />
        <RenameOffer :disabled="disabled" />
      </div>

      <TextListInput
        v-if="properties.kind !== 'note'"
        label="Also known as"
        :items="properties.aliases"
        placeholder="Add another name…"
        :disabled="disabled"
        @change="save({ aliases: $event })"
      />

      <template v-if="properties.kind === 'character'">
        <TextListInput
          :key="properties.path"
          label="Groups"
          :items="properties.groups ?? []"
          placeholder="Choose or add a group…"
          :suggestions="groupNames"
          :disabled="disabled || properties.groupsEditable === false"
          @change="save({ groups: characterGroupNames($event) })"
        />
        <p v-if="properties.groupsEditable === false" class="hint bad" role="alert">
          Groups must be text or a list of names. This field is read-only; the original value is
          shown below. Edit it in the file to enable group changes.
        </p>
        <div class="field">
          <label class="eyebrow" for="codex-role">Role</label>
          <input
            id="codex-role"
            v-model="role"
            type="text"
            dir="auto"
            placeholder="Protagonist, mentor…"
            :disabled="disabled"
            @change="saveText('role', role)"
          />
        </div>
        <div class="field">
          <label class="eyebrow" for="codex-born">Born</label>
          <input
            id="codex-born"
            v-model="born"
            type="text"
            :placeholder="
              inspector.vocabulary?.calendar === 'day-count' ? 'Day, for example -4000' : 'YYYY'
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
        <h3 class="eyebrow">Appears in</h3>
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
            <span class="muted"> · {{ chapter.keys.map((key) => KEY_NAMES[key]).join(', ') }}</span>
          </li>
        </ul>
        <p v-else class="empty">No chapter lists this {{ properties.kind }} yet.</p>
      </section>

      <section v-if="properties.otherKeys.length > 0" class="field">
        <h3 class="eyebrow">Other properties</h3>
        <dl class="others">
          <template v-for="other in properties.otherKeys" :key="other.key">
            <dt>{{ other.key }}</dt>
            <dd dir="auto">{{ other.value }}</dd>
          </template>
        </dl>
        <p class="muted small-text">Shown as written. Edit them in the file.</p>
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
  gap: 6px;
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
  margin: 2px 0 0;
  font-size: 12px;
}

.others {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
  font-size: 13px;
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
