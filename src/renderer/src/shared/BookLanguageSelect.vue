<script setup lang="ts">
import { computed } from 'vue'
import { BOOK_LANGUAGE_CHOICES } from '../../../contract/book-languages'
import { useUiLanguageStore } from '../app/ui-language-store'

/** The chosen tag; `null` only while a book declares no language. */
const model = defineModel<string | null>({ required: true })
defineProps<{ disabled?: boolean; describedBy?: string }>()

const language = useUiLanguageStore()

/** A tag the app has no words for, kept as an option so the select shows what the book says. */
const otherTag = computed(() =>
  model.value !== null && !BOOK_LANGUAGE_CHOICES.some((choice) => choice.tag === model.value)
    ? model.value
    : null
)

function change(event: Event): void {
  if (event.target instanceof HTMLSelectElement) model.value = event.target.value || null
}
</script>

<template>
  <label class="book-language">
    <span>{{ language.t('book-language-label') }}</span>
    <select
      :value="model ?? ''"
      :disabled="disabled"
      :aria-describedby="describedBy"
      @change="change"
    >
      <option v-if="model === null" value="">{{ language.t('book-language-unset') }}</option>
      <option
        v-for="choice in BOOK_LANGUAGE_CHOICES"
        :key="choice.tag"
        :value="choice.tag"
        :lang="choice.tag"
        :dir="choice.direction"
      >
        {{ choice.name }}
      </option>
      <option v-if="otherTag !== null" :value="otherTag">
        {{ language.t('book-language-other', otherTag) }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.book-language {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

select {
  align-self: flex-start;
}
</style>
