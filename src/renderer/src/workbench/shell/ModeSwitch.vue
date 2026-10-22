<script setup lang="ts">
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { MODES, type Mode } from '../model/vocabulary'

const workbench = useWorkbenchStore()
const navigation = useWorkbenchNavigation()
const language = useUiLanguageStore()

const NAMES = { writing: 'mode-writing', plotting: 'mode-plotting' } as const

function choose(mode: Mode): void {
  void navigation.switchMode(mode)
}
</script>

<template>
  <div class="mode-switch" role="group" :aria-label="language.t('mode-label')">
    <button
      v-for="mode in MODES"
      :key="mode"
      type="button"
      :aria-pressed="workbench.mode === mode"
      :class="{ on: workbench.mode === mode }"
      @click="choose(mode)"
    >
      {{ language.t(NAMES[mode]) }}
    </button>
  </div>
</template>

<style scoped>
.mode-switch {
  display: flex;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 999px;
}

.mode-switch button {
  padding-block: 3px;
  padding-inline: 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
}

.mode-switch button.on {
  background: var(--accent-soft);
  color: var(--text-strong);
}
</style>
