<script setup lang="ts">
import type { Locale, PageWidth, ThemePreference, WritingSize } from '@plotdevice/contracts'
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import AboutDialog from './AboutDialog.vue'

const settings = useSettingsStore()
const t = settings.t
const languages: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
]
const themes: ThemePreference[] = ['system', 'light', 'dark']
const sizes: WritingSize[] = ['small', 'medium', 'large']
const widths: PageWidth[] = ['narrow', 'medium', 'wide']
const valueOf = (event: Event): string => (event.target as HTMLSelectElement).value
const about = ref<InstanceType<typeof AboutDialog> | null>(null)
</script>

<template>
  <details v-if="settings.preferences" class="settings-menu">
    <summary>{{ t('settings') }}</summary>
    <div class="settings">
      <label>
        {{ t('settings-language') }}
        <select data-testid="language" :value="settings.preferences.locale" @change="settings.update({ locale: valueOf($event) as Locale })">
          <option v-for="language in languages" :key="language.value" :value="language.value" :lang="language.value">{{ language.label }}</option>
        </select>
      </label>
      <label>
        {{ t('settings-theme') }}
        <select data-testid="theme" :value="settings.preferences.theme" @change="settings.update({ theme: valueOf($event) as ThemePreference })">
          <option v-for="theme in themes" :key="theme" :value="theme">{{ t(`theme-${theme}`) }}</option>
        </select>
      </label>
      <label>
        {{ t('settings-writing-size') }}
        <select data-testid="writing-size" :value="settings.preferences.writingSize" @change="settings.update({ writingSize: valueOf($event) as WritingSize })">
          <option v-for="size in sizes" :key="size" :value="size">{{ t(`size-${size}`) }}</option>
        </select>
      </label>
      <label>
        {{ t('settings-page-width') }}
        <select data-testid="page-width" :value="settings.preferences.pageWidth" @change="settings.update({ pageWidth: valueOf($event) as PageWidth })">
          <option v-for="width in widths" :key="width" :value="width">{{ t(`width-${width}`) }}</option>
        </select>
      </label>
      <p v-if="settings.saveFailed" class="warning" role="status">⚠ {{ t('settings-save-failed') }}</p>
      <button type="button" class="link-button" data-testid="open-about" @click="about?.show()">{{ t('about') }}</button>
    </div>
  </details>
  <!-- Beside the panel, not in it: it stays open when the panel closes. -->
  <AboutDialog ref="about" />
</template>
