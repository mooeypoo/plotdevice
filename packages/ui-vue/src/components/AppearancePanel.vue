<script setup lang="ts">
import type { PageWidth, WritingSize } from '@plotdevice/contracts'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'
import PopoverPanel from './PopoverPanel.vue'

// "Aa" in the top bar, in Write: how the page looks, beside the page it changes. Changing anything
// here restyles the page in place; the editor, cursor and undo history stay.
const settings = useSettingsStore()
const view = useViewStore()
const t = settings.t
const sizes: WritingSize[] = ['small', 'medium', 'large']
const widths: PageWidth[] = ['narrow', 'medium', 'wide']
function enterFocus(close: (returnFocus?: boolean) => void): void {
  close(false)
  view.setFocusMode(true)
}
const focusKey = navigator.platform.startsWith('Mac') ? '⌘⇧F' : 'Ctrl+Shift+F'
</script>

<template>
  <PopoverPanel :label="t('appearance')" testid="appearance" button-class="icon-button aa-button" align="end">
    <template #button>Aa</template>
    <template #default="{ close }">
      <div v-if="settings.preferences" class="appearance">
        <div class="option-row">
          <span id="appearance-size">{{ t('settings-writing-size') }}</span>
          <div class="segmented" role="group" aria-labelledby="appearance-size">
            <button
              v-for="size in sizes"
              :key="size"
              type="button"
              :class="`size-${size}`"
              :aria-pressed="settings.preferences.writingSize === size"
              :aria-label="t(`size-${size}`)"
              :title="t(`size-${size}`)"
              :data-testid="`writing-size-${size}`"
              @click="settings.update({ writingSize: size })"
            >
              A
            </button>
          </div>
        </div>
        <div class="option-row">
          <span id="appearance-width">{{ t('settings-page-width') }}</span>
          <div class="segmented" role="group" aria-labelledby="appearance-width">
            <button
              v-for="width in widths"
              :key="width"
              type="button"
              :aria-pressed="settings.preferences.pageWidth === width"
              :data-testid="`page-width-${width}`"
              @click="settings.update({ pageWidth: width })"
            >
              {{ t(`width-${width}`) }}
            </button>
          </div>
        </div>
        <button type="button" class="wide-button" data-testid="focus-mode" @click="enterFocus(close)">
          <span>{{ t('focus-enter') }}</span
          ><span class="hint" dir="ltr">{{ focusKey }}</span>
        </button>
      </div>
    </template>
  </PopoverPanel>
</template>
