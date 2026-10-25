<script setup lang="ts">
import { computed } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useCodexStore } from '../../app/codex-store'
import { useReferenceStore } from '../../app/reference-store'
import { isolate } from '../../shared/isolate'
import SelectField from '../../shared/SelectField.vue'
import type { SelectOption } from '../../shared/select-option'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { linkLabel } from './link-targets'
import { useRelationships } from './use-relationships'

defineProps<{ disabled: boolean }>()

const language = useUiLanguageStore()
const { formatNumber } = useChromePresentation()
const codex = useCodexStore()
const reference = useReferenceStore()
const { rows, characters, add, remove, save } = useRelationships()

const characterOptions = computed((): SelectOption[] => [
  { value: '', label: language.t('codex-inspector-relationship-who'), disabled: true },
  ...characters.value.map((option) => ({
    value: option.target,
    label: option.missing
      ? language.t('codex-inspector-relationship-missing', isolate(option.target))
      : option.label
  }))
])
</script>

<template>
  <section class="field" aria-labelledby="relationships-heading">
    <h3 id="relationships-heading" class="eyebrow">
      {{ language.t('codex-inspector-relationships') }}
    </h3>

    <template v-if="codex.properties?.relationshipsEditable">
      <div v-for="(row, index) in rows" :key="index" class="relationship">
        <div class="line">
          <SelectField
            v-model="row.target"
            :options="characterOptions"
            :placeholder="language.t('codex-inspector-relationship-who')"
            :aria-label="language.t('codex-inspector-relationship-with', formatNumber(index + 1))"
            :disabled="disabled"
            @update:model-value="save"
          />
          <button
            type="button"
            class="remove"
            :aria-label="language.t('codex-inspector-relationship-remove', formatNumber(index + 1))"
            :disabled="disabled"
            @click="remove(index)"
          >
            ×
          </button>
        </div>
        <input
          v-model="row.kind"
          type="text"
          dir="auto"
          :placeholder="language.t('codex-inspector-relationship-kind-placeholder')"
          :aria-label="language.t('codex-inspector-relationship-kind', formatNumber(index + 1))"
          :disabled="disabled"
          @change="save"
        />
        <input
          v-model="row.note"
          type="text"
          dir="auto"
          :placeholder="language.t('codex-inspector-relationship-note-placeholder')"
          :aria-label="language.t('codex-inspector-relationship-note', formatNumber(index + 1))"
          :disabled="disabled"
          @change="save"
        />
      </div>
      <button type="button" class="quiet small" :disabled="disabled" @click="add">
        {{ language.t('codex-inspector-relationship-add') }}
      </button>
    </template>

    <template v-else>
      <ul class="plain">
        <li v-for="(relationship, index) in codex.properties?.relationships ?? []" :key="index">
          <span dir="auto">{{ linkLabel(relationship.with) }}</span>
          <span v-if="relationship.kind" class="muted" dir="auto"> · {{ relationship.kind }} </span>
          <p v-if="relationship.note" class="muted small-text" dir="auto">
            {{ relationship.note }}
          </p>
        </li>
      </ul>
      <p class="note">{{ language.t('codex-inspector-relationships-read-only') }}</p>
    </template>

    <p v-if="codex.relationshipsError" class="note warn" role="alert">
      {{ codex.relationshipsError }}
    </p>

    <div v-if="codex.listedBy.length > 0" class="listed-by">
      <h4 class="eyebrow">{{ language.t('codex-inspector-listed-by') }}</h4>
      <ul class="plain">
        <li v-for="other in codex.listedBy" :key="other.path">
          <button type="button" class="link" dir="auto" @click="reference.open(other.path)">
            {{ other.title }}
          </button>
          <span v-if="other.kind" class="muted" dir="auto"> · {{ other.kind }}</span>
          <p v-if="other.note" class="muted small-text" dir="auto">{{ other.note }}</p>
        </li>
      </ul>
      <p class="muted small-text">
        {{ language.t('codex-inspector-relationships-one-way') }}
      </p>
    </div>
  </section>
</template>

<style scoped src="./inspector.css"></style>
<style scoped>
h3,
h4 {
  margin: 0;
}

.relationship {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}

.line {
  display: flex;
  gap: 4px;
}

.remove {
  padding: 0 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
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

.listed-by {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
</style>
