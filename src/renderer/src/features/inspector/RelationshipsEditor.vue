<script setup lang="ts">
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { linkLabel } from './link-targets'
import { useRelationships } from './use-relationships'

defineProps<{ disabled: boolean }>()

const codex = useCodexStore()
const editor = useEditorStore()
const { rows, characters, add, remove, save } = useRelationships()
</script>

<template>
  <section class="field" aria-labelledby="relationships-heading">
    <h3 id="relationships-heading" class="eyebrow">Relationships</h3>

    <template v-if="codex.properties?.relationshipsEditable">
      <div v-for="(row, index) in rows" :key="index" class="relationship">
        <div class="line">
          <select
            v-model="row.target"
            :aria-label="`Relationship ${index + 1}: with`"
            dir="auto"
            :disabled="disabled"
            @change="save"
          >
            <option value="" disabled>Who…</option>
            <option v-for="option in characters" :key="option.target" :value="option.target">
              {{ option.label }}
            </option>
          </select>
          <button
            type="button"
            class="remove"
            :aria-label="`Remove relationship ${index + 1}`"
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
          placeholder="Kind: mentor, sister, rival…"
          :aria-label="`Relationship ${index + 1}: kind`"
          :disabled="disabled"
          @change="save"
        />
        <input
          v-model="row.note"
          type="text"
          dir="auto"
          placeholder="Note"
          :aria-label="`Relationship ${index + 1}: note`"
          :disabled="disabled"
          @change="save"
        />
      </div>
      <button type="button" class="quiet small" :disabled="disabled" @click="add">
        + Add relationship
      </button>
    </template>

    <template v-else>
      <ul class="plain">
        <li v-for="(relationship, index) in codex.properties?.relationships ?? []" :key="index">
          <span dir="auto">{{ linkLabel(relationship.with) }}</span>
          <span v-if="relationship.kind" class="muted"> · {{ relationship.kind }}</span>
          <p v-if="relationship.note" class="muted small-text" dir="auto">
            {{ relationship.note }}
          </p>
        </li>
      </ul>
      <p class="note">
        This file writes its relationships in a way Plot Device can’t edit safely, so they’re shown
        read-only. Edit them in the file itself.
      </p>
    </template>

    <p v-if="codex.relationshipsError" class="note warn" role="alert">
      {{ codex.relationshipsError }}
    </p>

    <div v-if="codex.listedBy.length > 0" class="listed-by">
      <h4 class="eyebrow">Listed by</h4>
      <ul class="plain">
        <li v-for="other in codex.listedBy" :key="other.path">
          <button type="button" class="link" dir="auto" @click="editor.open(other.path)">
            {{ other.title }}
          </button>
          <span v-if="other.kind" class="muted"> · {{ other.kind }}</span>
          <p v-if="other.note" class="muted small-text" dir="auto">{{ other.note }}</p>
        </li>
      </ul>
      <p class="muted small-text">
        Relationships are one-way: these are written in the other characters’ files.
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
