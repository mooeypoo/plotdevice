<script setup lang="ts">
import { computed } from 'vue'
import type { MessageKey } from '../../../../i18n/translator'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import SelectField from '../../shared/SelectField.vue'
import type { SelectOption } from '../../shared/select-option'
import { viewsIn } from '../model/layout'
import type { PresetId } from '../model/presets'
import { layoutChoices, layoutFor, type LayoutChoice } from '../model/workbench-settings'
import { VIEW_REGISTRY } from '../views/view-registry'
import LayoutMenu from './LayoutMenu.vue'

const PRESET_NAMES: Record<PresetId, MessageKey> = {
  write: 'workbench-layout-write',
  revise: 'workbench-layout-revise',
  plot: 'workbench-layout-plot'
}

const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const navigation = useWorkbenchNavigation()

/** The current mode's layouts whose views all exist, so choosing one never shows an empty panel. */
const choices = computed(() =>
  layoutChoices(workbench.settings, workbench.mode).filter((choice) => {
    const layout = layoutFor(workbench.settings, choice.id)
    return (
      layout !== undefined && viewsIn(layout).every((view) => VIEW_REGISTRY[view] !== undefined)
    )
  })
)
const name = (choice: LayoutChoice): string =>
  choice.kind === 'preset' ? language.t(PRESET_NAMES[choice.id as PresetId]) : choice.name

const options = computed((): SelectOption[] =>
  choices.value.map((choice) => ({ value: choice.id, label: name(choice) }))
)

/** A refused switch (a pending recovery decision) leaves the active layout, and so the value, as is. */
function choose(id: string): void {
  void navigation.switchLayout(id)
}
</script>

<template>
  <span class="layout-switcher-group">
    <SelectField
      v-if="choices.length > 1"
      class="layout-switcher"
      size="small"
      :aria-label="language.t('workbench-layout-label')"
      :model-value="workbench.activeLayoutId"
      :options="options"
      @update:model-value="choose"
    />
    <LayoutMenu />
  </span>
</template>

<style scoped>
.layout-switcher-group {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

.layout-switcher {
  max-inline-size: 12em;
}
</style>
