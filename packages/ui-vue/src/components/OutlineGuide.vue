<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'

// Outlines have one fixed shape, so the app explains it once, above the first outline the author opens,
// instead of making it configurable (Milestone 19). A guide in the app, never text in the file.
const settings = useSettingsStore()
</script>

<template>
  <aside v-if="settings.preferences && !settings.preferences.outlineGuideSeen" class="outline-guide" data-testid="outline-guide">
    <svg class="outline-guide-board" viewBox="0 0 96 48" aria-hidden="true">
      <g v-for="column in 3" :key="column" :transform="`translate(${(column - 1) * 33} 0)`">
        <rect width="30" height="5" rx="2" class="guide-section" />
        <rect y="9" width="30" height="10" rx="2.5" class="guide-card" />
        <rect v-if="column !== 2" y="23" width="30" height="10" rx="2.5" class="guide-card" />
        <rect v-if="column === 1" y="37" width="30" height="10" rx="2.5" class="guide-card" />
      </g>
    </svg>
    <p>{{ settings.t('outline-guide') }}</p>
    <button type="button" data-testid="outline-guide-done" @click="settings.update({ outlineGuideSeen: true })">
      {{ settings.t('outline-guide-done') }}
    </button>
  </aside>
</template>
