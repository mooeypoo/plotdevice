<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'

// Content the views can't show is never hidden or lost: it stays visible, as written, and explained.
defineProps<{ text: string }>()
const settings = useSettingsStore()
</script>

<template>
  <details class="kept" data-testid="kept-as-written">
    <summary :title="settings.t('kept-explanation')">{{ settings.t('kept-as-written') }}</summary>
    <p class="secondary">{{ settings.t('kept-explanation') }}</p>
    <pre dir="auto">{{ text }}</pre>
  </details>
</template>
