<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'
import MenuButton from './MenuButton.vue'
import type { MenuItem } from './menu'

// Format, at the top corner of the page itself (Milestone 17, decision 8): for the paragraph the
// cursor is in, with nothing selected (the bubble handles a selection). A word, not ¶, which most
// people read as "show hidden marks". It stays at the top of the visible page while scrolling.
defineProps<{ items: MenuItem[] }>()
const t = useSettingsStore().t
</script>

<template>
  <div class="page-tools">
    <MenuButton :label="t('toolbar-format')" :items="items" button-class="format-button" align="end" testid="format-menu">
      <span class="format-b" aria-hidden="true">B</span>
      <span>{{ t('toolbar-format') }}</span>
    </MenuButton>
  </div>
</template>
