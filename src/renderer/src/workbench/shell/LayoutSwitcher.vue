<script setup lang="ts">
import { computed } from 'vue'
import type { MessageKey } from '../../../../i18n/translator'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { viewsIn } from '../model/layout'
import type { PresetId } from '../model/presets'
import { layoutChoices, layoutFor, type LayoutChoice } from '../model/workbench-settings'
import { VIEW_REGISTRY } from '../views/view-registry'

const PRESET_NAMES: Record<PresetId, MessageKey> = {
  write: 'workbench-layout-write',
  revise: 'workbench-layout-revise',
  plot: 'workbench-layout-plot'
}

const workbench = useWorkbenchStore()
const language = useUiLanguageStore()

/** Writing layouts whose views all exist, so choosing one never shows an empty panel. */
const choices = computed(() =>
  layoutChoices(workbench.settings, 'writing').filter((choice) => {
    const layout = layoutFor(workbench.settings, choice.id)
    return (
      layout !== undefined && viewsIn(layout).every((view) => VIEW_REGISTRY[view] !== undefined)
    )
  })
)
const name = (choice: LayoutChoice): string =>
  choice.kind === 'preset' ? language.t(PRESET_NAMES[choice.id as PresetId]) : choice.name

function choose(event: Event): void {
  if (event.target instanceof HTMLSelectElement) workbench.setActiveLayout(event.target.value)
}
</script>

<template>
  <select
    v-if="choices.length > 1"
    class="layout-switcher"
    :aria-label="language.t('workbench-layout-label')"
    :value="workbench.activeLayoutId"
    @change="choose"
  >
    <option v-for="choice in choices" :key="choice.id" :value="choice.id" dir="auto">
      {{ name(choice) }}
    </option>
  </select>
</template>

<style scoped>
.layout-switcher {
  max-width: 12em;
  font-size: 12px;
}
</style>
