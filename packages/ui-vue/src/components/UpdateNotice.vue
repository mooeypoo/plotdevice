<script setup lang="ts">
import { downloadFor, useUpdatesStore } from '../stores/updates'
import { useSettingsStore } from '../stores/settings'
import PopoverPanel from './PopoverPanel.vue'

// "Update available" in the top bar (Milestone 15): quiet until opened, and gone once dismissed.
// It never interrupts writing; the links open in the browser.
const updates = useUpdatesStore()
const settings = useSettingsStore()
const t = settings.t

function notNow(close: (returnFocus?: boolean) => void): void {
  close(false)
  void updates.dismiss()
}
</script>

<template>
  <PopoverPanel
    v-if="updates.available"
    :label="t('update-is-out', updates.available.version)"
    testid="update-available"
    button-class="update-button"
    align="end"
  >
    <template #button>{{ t('update-available') }}</template>
    <template #default="{ close }">
      <div class="update-notice">
        <p>{{ t('update-is-out', updates.available.version) }}</p>
        <p class="update-links">
          <a :href="updates.available.notes" target="_blank" rel="noreferrer" data-testid="update-notes">{{ t('update-whats-new') }}</a>
          <a :href="downloadFor(updates.available, settings.locale)" target="_blank" rel="noreferrer" data-testid="update-download">{{
            t('update-download')
          }}</a>
        </p>
        <button type="button" data-testid="update-not-now" @click="notNow(close)">{{ t('update-not-now') }}</button>
      </div>
    </template>
  </PopoverPanel>
</template>
