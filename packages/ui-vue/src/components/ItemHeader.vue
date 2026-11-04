<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'
import { sidebarKeys, useViewStore } from '../stores/view'
import AppIcon from './AppIcon.vue'

// One header row for whatever is open, in Write and Story alike (Milestone 17, decision 4): the
// sidebar toggle, then the item (its name, its views, its ⋯) in the default slot, and its tools at the
// far end. It is about this item; the top bar is about the book and the app.
const settings = useSettingsStore()
const view = useViewStore()
const t = settings.t
</script>

<template>
  <div class="item-header" data-testid="item-header">
    <button
      type="button"
      class="icon-button"
      data-testid="toggle-navigator"
      :aria-pressed="!view.navigatorHidden && !view.focusMode"
      :aria-label="t('sidebar-toggle')"
      :title="`${t('sidebar-toggle')} (${sidebarKeys()})`"
      @click="view.toggleNavigator()"
    >
      <AppIcon name="chapters" />
    </button>
    <slot />
    <span class="grow"></span>
    <slot name="end" />
  </div>
</template>
