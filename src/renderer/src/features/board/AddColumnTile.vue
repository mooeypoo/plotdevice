<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'

/** The quiet tile after the last column (D5): "+ Add column", then a field for its name. */
const emit = defineEmits<{ add: [title: string, done: () => void] }>()

const language = useUiLanguageStore()
const open = ref(false)
const name = ref('')
const field = useTemplateRef<HTMLInputElement>('field')
const opener = useTemplateRef<HTMLButtonElement>('opener')

async function start(): Promise<void> {
  open.value = true
  name.value = ''
  await nextTick()
  field.value?.focus()
}

async function close(): Promise<void> {
  open.value = false
  await nextTick()
  opener.value?.focus()
}

function submit(): void {
  if (name.value.trim() === '') return
  emit('add', name.value, () => void close())
}
</script>

<template>
  <li class="add-column">
    <form v-if="open" @submit.prevent="submit">
      <input
        ref="field"
        v-model="name"
        type="text"
        dir="auto"
        maxlength="2000"
        :aria-label="language.t('board-add-column-label')"
        :placeholder="language.t('board-add-column-label')"
        @keydown.escape.prevent.stop="close"
      />
    </form>
    <button v-else ref="opener" type="button" class="quiet" @click="start">
      {{ language.t('board-add-column') }}
    </button>
  </li>
</template>

<style scoped>
.add-column {
  flex: 0 0 180px;
  padding: var(--space-3);
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-card);
}

.add-column button {
  inline-size: 100%;
  font-size: var(--text-small);
}

.add-column input {
  inline-size: 100%;
}
</style>
