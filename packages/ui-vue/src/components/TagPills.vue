<script setup lang="ts">
import { tagRow, tagSuggestions } from '@plotdevice/presentation'
import { tagKey } from '@plotdevice/shared'
import { computed, nextTick, ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'

// A page's tags as calm pills, each with ×, and "+ Tag", which suggests the project's tags while the
// author types (Milestone 12). Enter adds the highlighted one, or a new tag when nothing matches.
const props = defineProps<{ tags: string[]; disabled?: boolean }>()
const emit = defineEmits<{ change: [tags: string[]] }>()
const story = useStoryStore()
const settings = useSettingsStore()
const t = settings.t
const adding = ref(false)
const typed = ref('')
const selected = ref(0)
const input = ref<HTMLInputElement | null>(null)
const addButton = ref<HTMLButtonElement | null>(null)
/** The tags as the author left them, ahead of the file while a change is being written. */
const own = ref([...props.tags])
watch(
  () => props.tags,
  (tags) => (own.value = [...tags]),
)

const suggestions = computed(() => tagSuggestions(tagRow(story.references, settings.locale), own.value, typed.value))
/** What Enter can add: the suggestions, then the typed text as a new tag unless it is one already. */
const options = computed(() => {
  const text = typed.value.trim()
  const known = text === '' || [...own.value, ...suggestions.value].some((tag) => tagKey(tag) === tagKey(text))
  return [...suggestions.value.map((tag) => ({ tag, isNew: false })), ...(known ? [] : [{ tag: text, isNew: true }])]
})

async function start(): Promise<void> {
  adding.value = true
  typed.value = ''
  selected.value = 0
  await nextTick()
  input.value?.focus()
}

function finish(): void {
  adding.value = false
  void nextTick(() => addButton.value?.focus())
}

function add(tag: string): void {
  typed.value = ''
  selected.value = 0
  if (own.value.some((known) => tagKey(known) === tagKey(tag))) return
  own.value = [...own.value, tag]
  emit('change', [...own.value])
}

function remove(tag: string): void {
  own.value = own.value.filter((known) => known !== tag)
  emit('change', [...own.value])
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') selected.value = Math.min(selected.value + 1, options.value.length - 1)
  else if (event.key === 'ArrowUp') selected.value = Math.max(selected.value - 1, 0)
  else if (event.key === 'Enter') {
    const option = options.value[selected.value]
    if (option) add(option.tag)
    else finish()
  } else if (event.key === 'Escape') finish()
  else return
  event.preventDefault()
}
</script>

<template>
  <div class="tag-pills" role="group" :aria-label="t('tags')" data-testid="page-tags">
    <span v-for="tag in own" :key="tag" class="tag-pill" :data-tag="tag">
      <span dir="auto">{{ tag }}</span>
      <button
        v-if="!disabled"
        type="button"
        class="tag-remove"
        :aria-label="t('tag-remove', tag)"
        :title="t('tag-remove', tag)"
        @click="remove(tag)"
      >
        ×
      </button>
    </span>
    <span v-if="adding" class="tag-adder">
      <input
        ref="input"
        v-model="typed"
        type="text"
        dir="auto"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="tag-options"
        :aria-expanded="options.length > 0"
        :aria-activedescendant="options.length > 0 ? `tag-option-${selected}` : undefined"
        :aria-label="t('tag-add-label')"
        data-testid="tag-input"
        @input="selected = 0"
        @keydown="onKey"
        @blur="finish"
      />
      <ul v-if="options.length > 0" id="tag-options" role="listbox" class="tag-options" :aria-label="t('tags')">
        <li
          v-for="(option, index) in options"
          :id="`tag-option-${index}`"
          :key="option.tag"
          role="option"
          :aria-selected="index === selected"
          :class="{ selected: index === selected }"
          dir="auto"
          @mousedown.prevent="add(option.tag)"
        >
          {{ option.isNew ? t('tag-create', option.tag) : option.tag }}
        </li>
      </ul>
    </span>
    <button
      v-else-if="!disabled"
      ref="addButton"
      type="button"
      class="tag-add"
      :aria-label="t('tag-add-label')"
      data-testid="tag-add"
      @click="start"
    >
      {{ t('tag-add') }}
    </button>
  </div>
</template>
