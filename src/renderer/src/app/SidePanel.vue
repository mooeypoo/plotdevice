<script setup lang="ts">
import BinderTree from '../features/binder/BinderTree.vue'
import type { DropRequest } from '../features/binder/binder-drop'
import CodexList from '../features/codex/CodexList.vue'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useLayoutStore, type SideTab } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import { useWorkspaceStore } from './workspace-store'
import { useReferenceStore } from './reference-store'
import { useSidePanelNavigation } from './use-side-panel-navigation'

defineProps<{ attentionCount: number }>()
defineEmits<{ move: [request: DropRequest] }>()

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const codex = useCodexStore()
const editor = useEditorStore()
const layout = useLayoutStore()
const reference = useReferenceStore()
const { openEntry, editEntry, consultEntry, selectedCodexPath } = useSidePanelNavigation()

const TABS: readonly { readonly id: SideTab; readonly label: string }[] = [
  { id: 'manuscript', label: 'Manuscript' },
  { id: 'codex', label: 'Codex' }
]
</script>

<template>
  <div class="side">
    <div class="tabs" role="tablist" aria-label="Side panel">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="layout.sideTab === tab.id"
        :class="{ selected: layout.sideTab === tab.id }"
        @click="layout.sideTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>
    <BinderTree
      v-if="layout.sideTab === 'manuscript' && manuscript.manuscript && workspace.project"
      :project-root="workspace.project.root"
      :manuscript="manuscript.manuscript"
      :selected-path="editor.entry?.path ?? null"
      :attention-count="attentionCount"
      :read-only="workspace.project?.readOnly ?? false"
      @open="openEntry($event)"
      @reference="reference.open($event)"
      @show-overview="editor.closeEntry()"
      @create-chapter="(part, title) => manuscript.createChapter(part, title)"
      @create-part="manuscript.createPart($event)"
      @move="$emit('move', $event)"
    />
    <nav
      v-else-if="layout.sideTab === 'codex' && codex.listing && workspace.project"
      class="codex"
      aria-label="Codex"
    >
      <CodexList
        :listing="codex.listing"
        :project-root="workspace.project.root"
        :selected-path="selectedCodexPath"
        :read-only="workspace.project?.readOnly ?? false"
        @open="consultEntry($event)"
        @edit="editEntry($event)"
        @create="(kind, title) => codex.createEntry(kind, title)"
        @set-type="(path, type) => codex.setEntryType(path, type)"
        @edit-template="codex.editTemplate($event)"
        @create-outline="codex.createOutline($event)"
      />
    </nav>
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

.codex {
  flex: 1;
  overflow-y: auto;
  padding: 10px 10px 0;
}
</style>
