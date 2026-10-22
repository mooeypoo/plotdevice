<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'
import { linkLabel, linkTarget } from './link-targets'

const props = defineProps<{
  label: string
  /** Links as written in the file, for example `[[Ilka Szabó|Ilka]]`. */
  links: readonly string[]
  suggestions: readonly string[]
  /** Only one link (POV); choosing another replaces it. */
  single?: boolean
  disabled: boolean
}>()

const emit = defineEmits<{ change: [targets: string[]] }>()

const language = useUiLanguageStore()
const draft = ref('')
const inputId = useId()
const listId = useId()
const targets = computed(() => props.links.map(linkTarget))
const remaining = computed(() =>
  props.suggestions.filter(
    (name) => !targets.value.some((target) => target.toLowerCase() === name.toLowerCase())
  )
)

function add(): void {
  const name = draft.value.trim()
  draft.value = ''
  if (name === '' || targets.value.some((target) => target.toLowerCase() === name.toLowerCase())) {
    return
  }
  emit('change', props.single ? [name] : [...targets.value, name])
}

function remove(index: number): void {
  emit(
    'change',
    targets.value.filter((_, position) => position !== index)
  )
}
</script>

<template>
  <div class="field">
    <label class="eyebrow" :for="inputId">{{ label }}</label>
    <ul v-if="links.length > 0" class="chips">
      <li v-for="(link, index) in links" :key="link" class="chip" dir="auto">
        <span>{{ linkLabel(link) }}</span>
        <button
          type="button"
          class="remove"
          :disabled="disabled"
          :aria-label="language.t('link-picker-remove', isolate(linkLabel(link)))"
          @click="remove(index)"
        >
          ×
        </button>
      </li>
    </ul>
    <input
      :id="inputId"
      v-model="draft"
      type="text"
      :list="listId"
      :placeholder="
        single && links.length > 0
          ? language.t('link-picker-replace')
          : language.t('link-picker-add')
      "
      :disabled="disabled"
      dir="auto"
      @change="add"
      @keydown.enter.prevent="add"
    />
    <datalist :id="listId">
      <option v-for="name in remaining" :key="name" :value="name"></option>
    </datalist>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 6px;
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
  color: var(--link-character);
}

.remove {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  line-height: 1;
}
</style>
