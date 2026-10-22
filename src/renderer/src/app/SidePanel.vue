<script setup lang="ts">
import { useLayoutStore, type SideTab } from './layout-store'
import { useUiLanguageStore } from './ui-language-store'
import { registeredView } from '../workbench/views/view-registry'

const layout = useLayoutStore()
const language = useUiLanguageStore()

const TABS: readonly SideTab[] = ['manuscript', 'codex']
const BinderView = registeredView('binder').component
const CodexView = registeredView('codex').component
</script>

<template>
  <div class="side">
    <div class="tabs" role="tablist" :aria-label="language.t('side-tablist')">
      <button
        v-for="tab in TABS"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="layout.sideTab === tab"
        :class="{ selected: layout.sideTab === tab }"
        @click="layout.sideTab = tab"
      >
        {{ language.t(tab === 'manuscript' ? 'side-manuscript' : 'side-codex') }}
      </button>
    </div>
    <BinderView v-if="layout.sideTab === 'manuscript'" />
    <CodexView v-else />
  </div>
</template>

<style scoped>
.side {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  border-inline-end: 1px solid var(--line);
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
</style>
