<script setup lang="ts">
import type { Locale, ThemePreference } from '@plotdevice/contracts'
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import HelpLink from './HelpLink.vue'

// Settings for the whole app, opened from the app menu or Ctrl+,. How the page looks is in Aa instead.
const settings = useSettingsStore()
const t = settings.t
const languages: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
]
const themes: ThemePreference[] = ['system', 'light', 'dark']
const valueOf = (event: Event): string => (event.target as HTMLSelectElement).value
const dialog = ref<HTMLDialogElement | null>(null)

defineExpose({ show: () => dialog.value?.showModal() })
</script>

<template>
  <dialog ref="dialog" class="dialog settings-dialog" data-testid="settings" aria-labelledby="settings-title">
    <h2 id="settings-title">{{ t('settings') }}</h2>
    <template v-if="settings.preferences">
      <label>
        {{ t('settings-language') }}
        <select
          data-testid="language"
          :value="settings.preferences.locale"
          @change="settings.update({ locale: valueOf($event) as Locale })"
        >
          <option v-for="language in languages" :key="language.value" :value="language.value" :lang="language.value">
            {{ language.label }}
          </option>
        </select>
      </label>
      <label>
        {{ t('settings-theme') }}
        <select
          data-testid="theme"
          :value="settings.preferences.theme"
          @change="settings.update({ theme: valueOf($event) as ThemePreference })"
        >
          <option v-for="theme in themes" :key="theme" :value="theme">{{ t(`theme-${theme}`) }}</option>
        </select>
      </label>
      <label class="check-row">
        <input
          type="checkbox"
          data-testid="check-for-updates-setting"
          :checked="settings.preferences.checkForUpdates"
          aria-describedby="check-for-updates-hint"
          @change="settings.update({ checkForUpdates: ($event.target as HTMLInputElement).checked })"
        />
        {{ t('settings-check-updates') }}
      </label>
      <p id="check-for-updates-hint" class="secondary hint">{{ t('settings-check-updates-hint') }}</p>
      <h3 class="settings-group">{{ t('settings-advanced') }}</h3>
      <label class="check-row">
        <input
          type="checkbox"
          data-testid="plain-text-setting"
          :checked="settings.preferences.plainTextByDefault"
          aria-describedby="plain-text-hint"
          @change="settings.update({ plainTextByDefault: ($event.target as HTMLInputElement).checked })"
        />
        {{ t('settings-plain-text') }}
      </label>
      <p id="plain-text-hint" class="secondary hint">
        {{ t('settings-plain-text-hint') }} <HelpLink page="writing/formatting" :label="t('help-topic-plain-text')" />
      </p>
    </template>
    <p v-if="settings.saveFailed" class="warning" role="status">⚠ {{ t('settings-save-failed') }}</p>
    <form method="dialog" class="actions">
      <button type="submit" class="primary" data-testid="settings-close">{{ t('versions-close') }}</button>
    </form>
  </dialog>
</template>
