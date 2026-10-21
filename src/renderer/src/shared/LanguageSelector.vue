<script setup lang="ts">
import { ref } from 'vue'
import { UI_LANGUAGES, isUiLocale } from '../../../i18n/locales'
import { useUiLanguageStore } from '../app/ui-language-store'

const language = useUiLanguageStore()
const select = ref<HTMLSelectElement | null>(null)

async function change(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLSelectElement)) return
  const next = event.target.value
  if (!isUiLocale(next)) throw new Error('Unsupported language option')
  await language.change(next)
  if (select.value !== null) select.value.value = language.locale
}
</script>

<template>
  <div class="language">
    <label>
      <span>{{ language.t('language-label') }}</span>
      <select ref="select" :value="language.locale" :disabled="language.busy" @change="change">
        <option
          v-for="option in UI_LANGUAGES"
          :key="option.locale"
          :value="option.locale"
          :lang="option.locale"
          :dir="option.direction"
        >
          {{ option.name }}
        </option>
      </select>
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
  font-size: 12px;
}
label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
select {
  max-inline-size: 100%;
  padding: 4px 6px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--raised);
  color: var(--text);
  font: inherit;
}
.notice {
  max-inline-size: 24rem;
  margin: 6px 0 0;
  color: var(--warning);
}
</style>
