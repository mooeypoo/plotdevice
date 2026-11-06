<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'
import { plainTextKeys } from './format-items'

// Format, at the top corner of the page itself (Milestone 17, decision 8): for the paragraph the
// cursor is in, with nothing selected (the bubble handles a selection). A word, not ¶, which most
// people read as "show hidden marks". It stays at the top of the visible page while scrolling.
// Beside it, for authors who turned it on in Settings, a switch to plain text and back.
defineProps<{ items: MenuItem[]; plain: boolean }>()
const emit = defineEmits<{ plain: [] }>()
const settings = useSettingsStore()
const t = settings.t
</script>

<template>
  <div class="page-tools">
    <button
      v-if="settings.preferences?.plainTextSwitch"
      type="button"
      class="format-button plain-switch"
      :aria-pressed="plain"
      :title="`${t('plain-text-switch')} (${plainTextKeys()})`"
      data-testid="plain-text-switch"
      @click="emit('plain')"
    >
      {{ t('plain-text-switch') }}
    </button>
    <MenuButton :label="t('toolbar-format')" :items="items" button-class="format-button" align="end" testid="format-menu">
      <span class="format-b" aria-hidden="true">B</span>
      <span>{{ t('toolbar-format') }}</span>
    </MenuButton>
  </div>
</template>
