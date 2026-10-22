<script setup lang="ts">
import { ref } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'

const props = defineProps<{
  label: string
  items: readonly string[]
  placeholder: string
  disabled: boolean
  suggestions?: readonly string[]
}>()

const emit = defineEmits<{ change: [items: string[]] }>()
const language = useUiLanguageStore()

const draft = ref('')
const id = `text-list-${Math.random().toString(36).slice(2)}`

function add(): void {
  const item = draft.value.trim()
  draft.value = ''
  if (item !== '' && !props.items.includes(item)) emit('change', [...props.items, item])
}

function remove(item: string): void {
  emit(
    'change',
    props.items.filter((existing) => existing !== item)
  )
}
</script>

<template>
  <div class="field">
    <label class="eyebrow" :for="id">{{ label }}</label>
    <ul v-if="items.length > 0" class="chips">
      <li v-for="item in items" :key="item" class="chip">
        <span dir="auto">{{ item }}</span>
        <button
          type="button"
          class="remove"
          :aria-label="language.t('codex-inspector-remove-item', isolate(item))"
          :disabled="disabled"
          @click="remove(item)"
        >
          ×
        </button>
      </li>
    </ul>
    <input
      :id="id"
      v-model="draft"
      type="text"
      dir="auto"
      :placeholder="placeholder"
      :disabled="disabled"
      :list="suggestions === undefined ? undefined : `${id}-suggestions`"
      @keydown.enter.prevent="add"
      @change="add"
    />
    <datalist v-if="suggestions !== undefined" :id="`${id}-suggestions`">
      <option v-for="suggestion in suggestions" :key="suggestion" :value="suggestion" />
    </datalist>
  </div>
</template>

<style scoped src="./inspector.css"></style>
<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 12px;
  color: var(--text);
}

.remove {
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
}
</style>
