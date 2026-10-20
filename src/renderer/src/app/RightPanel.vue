<script setup lang="ts">
import { computed, ref } from 'vue'
import CodexInspector from '../features/inspector/CodexInspector.vue'
import InspectorPanel from '../features/inspector/InspectorPanel.vue'
import OutlineInspector from '../features/inspector/OutlineInspector.vue'
import TemplateInspector from '../features/inspector/TemplateInspector.vue'
import OutlinePanel from '../features/outline/OutlinePanel.vue'
import { useEditorStore } from './editor-store'
import { useLayoutStore, type RightTab } from './layout-store'
import { useOutlineWidth } from './use-outline-width'

const editor = useEditorStore()
const layout = useLayoutStore()
const panel = ref<HTMLElement | null>(null)
const resize = useOutlineWidth(panel)
const { width, minimum, maximum, expanded } = resize

const TABS: readonly { readonly id: RightTab; readonly label: string }[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'outline', label: 'Outline' }
]

const kind = computed(() => editor.entry?.kind)
</script>

<template>
  <div
    id="right-panel"
    ref="panel"
    class="right"
    :style="layout.rightTab === 'outline' ? { width: `${width}px` } : undefined"
  >
    <div
      v-if="layout.rightTab === 'outline'"
      class="resize-handle"
      role="separator"
      tabindex="0"
      aria-label="Outline panel width"
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
      <div class="tabs" role="tablist" aria-label="Right panel">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="layout.rightTab === tab.id"
          :class="{ selected: layout.rightTab === tab.id }"
          @click="layout.rightTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <button
        v-if="layout.rightTab === 'outline'"
        type="button"
        class="quiet expand"
        :aria-expanded="expanded"
        aria-controls="right-panel"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Restore' : 'Expand' }}
      </button>
    </div>
    <template v-if="layout.rightTab === 'properties'">
      <p v-if="kind === undefined" class="nothing">
        Open a chapter or codex entry to see its properties.
      </p>
      <InspectorPanel v-else-if="kind === 'part' || kind === 'chapter'" />
      <TemplateInspector v-else-if="kind === 'template'" />
      <OutlineInspector v-else-if="kind === 'outline'" />
      <CodexInspector v-else />
    </template>
    <div v-else class="outline-tab">
      <OutlinePanel />
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
  align-items: center;
}

.expand {
  margin: 10px 8px 0 0;
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

.nothing {
  margin: 0;
  padding: 16px 18px;
  color: var(--text-muted);
}
</style>
