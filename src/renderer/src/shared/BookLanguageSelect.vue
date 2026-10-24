<script setup lang="ts">
import { computed } from 'vue'
import { BOOK_LANGUAGE_CHOICES } from '../../../contract/book-languages'
import { useUiLanguageStore } from '../app/ui-language-store'
import SelectField from './SelectField.vue'
import type { SelectOption } from './select-option'

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

const options = computed((): SelectOption[] => [
  ...(model.value === null ? [{ value: '', label: language.t('book-language-unset') }] : []),
  ...BOOK_LANGUAGE_CHOICES.map((choice) => ({
    value: choice.tag,
    label: choice.name,
    lang: choice.tag,
    dir: choice.direction
  })),
  ...(otherTag.value === null
    ? []
    : [{ value: otherTag.value, label: language.t('book-language-other', otherTag.value) }])
])

function change(value: string): void {
  model.value = value || null
}
</script>

<template>
  <label class="book-language">
    <span>{{ language.t('book-language-label') }}</span>
    <SelectField
      :model-value="model ?? ''"
      :options="options"
      :disabled="disabled"
      :aria-describedby="describedBy"
      @update:model-value="change"
    />
  </label>
</template>

<style scoped>
.book-language {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-body);
  color: var(--text-muted);
}

.select-field {
  align-self: flex-start;
}
</style>
