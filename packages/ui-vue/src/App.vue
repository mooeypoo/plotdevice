<script setup lang="ts">
import type { AppInfo, Locale, PlotDeviceApi, ThemePreference } from '@plotdevice/contracts'
import { catalogs, createTranslator } from '@plotdevice/i18n'
import { computed, ref } from 'vue'
import { useAppearance } from './composables/use-appearance'
import { usePreferences } from './composables/use-preferences'

const props = defineProps<{ api: PlotDeviceApi }>()

const { preferences, saveFailed, update } = usePreferences(props.api)
useAppearance(preferences)

const translate = createTranslator(catalogs)
const locale = computed(() => preferences.value?.locale ?? 'en')
const t = (key: string, ...params: (string | number)[]): string => translate(locale.value, key, ...params)

const appInfo = ref<AppInfo | null>(null)
void props.api.getAppInfo().then((info) => (appInfo.value = info))

const languages: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
]
const themes: ThemePreference[] = ['system', 'light', 'dark']
</script>

<template>
  <div v-if="preferences" class="shell">
    <header class="shell-header">
      <span class="app-name">{{ t('app-name') }}</span>
      <div class="settings">
        <label>
          {{ t('settings-language') }}
          <select data-testid="language" :value="preferences.locale" @change="update({ locale: ($event.target as HTMLSelectElement).value as Locale })">
            <option v-for="language in languages" :key="language.value" :value="language.value" :lang="language.value">{{ language.label }}</option>
          </select>
        </label>
        <label>
          {{ t('settings-theme') }}
          <select data-testid="theme" :value="preferences.theme" @change="update({ theme: ($event.target as HTMLSelectElement).value as ThemePreference })">
            <option v-for="theme in themes" :key="theme" :value="theme">{{ t(`theme-${theme}`) }}</option>
          </select>
        </label>
      </div>
    </header>

    <main class="page">
      <p class="welcome">{{ t('shell-welcome') }}</p>
      <p class="secondary">{{ t('shell-next') }}</p>
      <p v-if="saveFailed" class="warning" role="status">⚠ {{ t('settings-save-failed') }}</p>
    </main>

    <footer v-if="appInfo" class="secondary">{{ t('app-version', appInfo.version) }}</footer>
  </div>
</template>
