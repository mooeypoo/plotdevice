<script setup lang="ts">
import { computed, ref } from 'vue'
import { registeredView } from '../workbench/views/view-registry'
import { useLayoutStore, type RightTab } from './layout-store'
import { useOutlineWidth } from './use-outline-width'
import { navigateTabs } from '../shared/tab-navigation'
import { useUiLanguageStore } from './ui-language-store'
import type { MessageKey } from '../../../i18n/translator'

const layout = useLayoutStore()
const language = useUiLanguageStore()
const panel = ref<HTMLElement | null>(null)
const resize = useOutlineWidth(panel)
const { width, minimum, maximum, expanded } = resize

const TABS = [
  { id: 'properties', label: 'right-panel-properties' },
  { id: 'outline', label: 'right-panel-outline' },
  { id: 'reference', label: 'right-panel-reference' }
] as const satisfies readonly { readonly id: RightTab; readonly label: MessageKey }[]

const PropertiesView = registeredView('properties').component
const OutlinePanel = registeredView('outline').component
const ReferencePanel = registeredView('reference').component
const resizable = computed(() => layout.rightTab !== 'properties')
</script>

<template>
  <div
    id="right-panel"
    ref="panel"
    class="right"
    :style="resizable ? { width: `${width}px` } : undefined"
  >
    <div
      v-if="resizable"
      class="resize-handle"
      role="separator"
      tabindex="0"
      :aria-label="
        language.t(
          layout.rightTab === 'outline'
            ? 'right-panel-outline-width'
            : 'right-panel-reference-width'
        )
      "
      aria-orientation="vertical"
      aria-controls="right-panel"
      :aria-valuemin="minimum"
      :aria-valuemax="maximum"
      :aria-valuenow="width"
      @pointerdown="resize.start"
      @pointermove="resize.move"
      @pointerup="resize.finish"
      @pointercancel="resize.cancel"
      @lostpointercapture="resize.finish"
      @keydown="resize.keydown"
    ></div>
    <div class="panel-header">
      <div
        class="tabs"
        role="tablist"
        :aria-label="language.t('right-panel-tabs')"
        @keydown="navigateTabs"
      >
        <button
          v-for="tab in TABS"
          :id="`right-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="layout.rightTab === tab.id"
          :aria-controls="`right-panel-${tab.id}`"
          :tabindex="layout.rightTab === tab.id ? 0 : -1"
          :class="{ selected: layout.rightTab === tab.id }"
          @click="layout.rightTab = tab.id"
        >
          {{ language.t(tab.label) }}
        </button>
      </div>
      <button
        v-if="resizable"
        type="button"
        class="quiet expand"
        :aria-expanded="expanded"
        aria-controls="right-panel"
        @click="expanded = !expanded"
      >
        {{ language.t(expanded ? 'right-panel-restore' : 'right-panel-expand') }}
      </button>
    </div>
    <div
      v-if="layout.rightTab === 'properties'"
      id="right-panel-properties"
      class="properties-tab"
      role="tabpanel"
      aria-labelledby="right-tab-properties"
    >
      <PropertiesView />
    </div>
    <div
      v-else-if="layout.rightTab === 'outline'"
      id="right-panel-outline"
      class="outline-tab"
      role="tabpanel"
      aria-labelledby="right-tab-outline"
    >
      <OutlinePanel />
    </div>
    <div
      v-else
      id="right-panel-reference"
      class="reference-tab"
      role="tabpanel"
      aria-labelledby="right-tab-reference"
    >
      <ReferencePanel />
    </div>
  </div>
</template>

<style scoped>
.right {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 320px;
  flex-shrink: 0;
  border-inline-start: 1px solid var(--line);
  background: var(--panel);
}

.panel-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.expand {
  margin: 10px 0 0;
  margin-inline: auto 8px;
  padding: 4px 6px;
  font-size: 11px;
}

.resize-handle {
  position: absolute;
  z-index: 1;
  inset-inline-start: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}

.resize-handle:hover,
.resize-handle:focus-visible {
  background: var(--accent-soft);
  outline: 1px solid var(--accent);
}

.tabs {
  display: flex;
  flex: 1;
  flex-basis: 240px;
  min-width: 0;
  gap: 4px;
  padding: 10px 10px 0;
}

.tabs button {
  flex: 1;
  padding: 6px 0;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tabs button.selected {
  border-bottom-color: var(--accent);
  color: var(--text-strong);
}

.outline-tab {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 40px;
}

.properties-tab,
.reference-tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
</style>
