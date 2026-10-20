<script setup lang="ts">
import { computed } from 'vue'
import CodexInspector from '../features/inspector/CodexInspector.vue'
import InspectorPanel from '../features/inspector/InspectorPanel.vue'
import OutlineInspector from '../features/inspector/OutlineInspector.vue'
import TemplateInspector from '../features/inspector/TemplateInspector.vue'
import OutlinePanel from '../features/outline/OutlinePanel.vue'
import { useEditorStore } from './editor-store'
import { useLayoutStore, type RightTab } from './layout-store'

const editor = useEditorStore()
const layout = useLayoutStore()

const TABS: readonly { readonly id: RightTab; readonly label: string }[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'outline', label: 'Outline' }
]

const kind = computed(() => editor.entry?.kind)
</script>

<template>
  <div class="right">
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
  display: flex;
  flex-direction: column;
  width: 320px;
  flex-shrink: 0;
  border-inline-start: 1px solid var(--line);
  background: var(--panel);
}

.tabs {
  display: flex;
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
