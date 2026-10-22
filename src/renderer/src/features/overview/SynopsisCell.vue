<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'

const props = defineProps<{ synopsis: string | undefined; readOnly: boolean; title: string }>()
const emit = defineEmits<{ save: [synopsis: string] }>()

const language = useUiLanguageStore()
const editing = ref(false)
const draft = ref('')
const box = ref<HTMLTextAreaElement | null>(null)

async function start(): Promise<void> {
  if (props.readOnly) return
  draft.value = props.synopsis ?? ''
  editing.value = true
  await nextTick()
  box.value?.focus()
}

function finish(): void {
  if (!editing.value) return
  editing.value = false
  if (draft.value.trim() !== (props.synopsis ?? '').trim()) emit('save', draft.value)
}

function cancel(): void {
  editing.value = false
}
</script>

<template>
  <textarea
    v-if="editing"
    ref="box"
    v-model="draft"
    class="edit"
    dir="auto"
    rows="3"
    :aria-label="language.t('overview-synopsis-label', isolate(title))"
    @blur="finish"
    @keydown.esc.prevent="cancel"
    @keydown.enter.ctrl.prevent="finish"
    @keydown.enter.meta.prevent="finish"
  ></textarea>
  <button
    v-else
    type="button"
    class="show"
    :class="{ empty: !synopsis }"
    dir="auto"
    :disabled="readOnly"
    :title="readOnly ? undefined : language.t('overview-synopsis-edit')"
    @click="start"
  >
    {{ synopsis || (readOnly ? '' : language.t('overview-synopsis-add')) }}
  </button>
</template>

<style scoped>
.show {
  width: 100%;
  padding: 2px 4px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  line-height: 1.45;
  text-align: start;
}

.show:hover:not(:disabled) {
  background: var(--hover);
}

.show.empty {
  color: var(--text-muted);
  font-style: italic;
}

.edit {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  line-height: 1.45;
  resize: vertical;
}
</style>
