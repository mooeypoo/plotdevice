<script setup lang="ts">
import { UI_LANGUAGES, isUiLocale } from '../../../i18n/locales'
import { useUiLanguageStore } from '../app/ui-language-store'
import SelectField from './SelectField.vue'
import type { SelectOption } from './select-option'

const language = useUiLanguageStore()
const options: SelectOption[] = UI_LANGUAGES.map((option) => ({
  value: option.locale,
  label: option.name,
  lang: option.locale,
  dir: option.direction
}))

async function change(next: string): Promise<void> {
  if (!isUiLocale(next)) throw new Error('Unsupported language option')
  await language.change(next)
}
</script>

<template>
  <div class="language">
    <label>
      <span>{{ language.t('language-label') }}</span>
      <SelectField
        :model-value="language.locale"
        :options="options"
        :disabled="language.busy"
        size="small"
        @update:model-value="change"
      />
    </label>
    <p v-if="language.errorMessage" class="notice" role="alert">{{ language.errorMessage }}</p>
    <details v-if="language.locale === 'he'" class="notice">
      <summary>{{ language.t('language-incomplete-label') }}</summary>
      <p>{{ language.t('language-incomplete') }}</p>
    </details>
  </div>
</template>

<style scoped>
.language {
  position: relative;
  font-size: var(--text-small);
}
label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}
.notice {
  max-inline-size: 24rem;
  margin: var(--space-3) 0 0;
  color: var(--warning);
}
</style>
