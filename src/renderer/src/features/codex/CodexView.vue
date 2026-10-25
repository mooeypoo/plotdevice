<script setup lang="ts">
import { useCodexStore } from '../../app/codex-store'
import { useOutlineStore } from '../../app/outline-store'
import { useSidePanelNavigation } from '../../app/use-side-panel-navigation'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import CodexList from './CodexList.vue'

const workspace = useWorkspaceStore()
const codex = useCodexStore()
const outlines = useOutlineStore()
const language = useUiLanguageStore()
const { editDetails, consultEntry, selectedCodexPath } = useSidePanelNavigation()
</script>

<template>
  <p v-if="codex.loadError" class="notice error load-error" role="alert" dir="auto">
    {{ codex.loadError }}
  </p>
  <nav
    v-if="codex.listing && workspace.project"
    class="codex"
    :aria-label="language.t('side-codex-nav')"
  >
    <CodexList
      :listing="codex.listing"
      :outlines="outlines.outlines"
      :project-root="workspace.project.root"
      :selected-path="selectedCodexPath"
      :read-only="workspace.project.readOnly"
      @open="consultEntry($event)"
      @edit="editDetails($event)"
      @create="(kind, title) => codex.createEntry(kind, title)"
      @set-type="(path, type) => codex.setEntryType(path, type)"
      @edit-template="codex.editTemplate($event)"
      @create-outline="outlines.create($event)"
    />
  </nav>
</template>

<style scoped>
.codex {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-3) 0;
}

.load-error {
  margin: var(--space-3);
  overflow-wrap: anywhere;
}
</style>
