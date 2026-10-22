<script setup lang="ts">
import { useCodexStore } from '../../app/codex-store'
import { useSidePanelNavigation } from '../../app/use-side-panel-navigation'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import CodexList from './CodexList.vue'

const workspace = useWorkspaceStore()
const codex = useCodexStore()
const language = useUiLanguageStore()
const { editEntry, consultEntry, selectedCodexPath } = useSidePanelNavigation()
</script>

<template>
  <p v-if="codex.loadError" class="load-error" role="alert" dir="auto">
    {{ codex.loadError }}
  </p>
  <nav
    v-if="codex.listing && workspace.project"
    class="codex"
    :aria-label="language.t('side-codex-nav')"
  >
    <CodexList
      :listing="codex.listing"
      :project-root="workspace.project.root"
      :selected-path="selectedCodexPath"
      :read-only="workspace.project.readOnly"
      @open="consultEntry($event)"
      @edit="editEntry($event)"
      @create="(kind, title) => codex.createEntry(kind, title)"
      @set-type="(path, type) => codex.setEntryType(path, type)"
      @edit-template="codex.editTemplate($event)"
      @create-outline="codex.createOutline($event)"
    />
  </nav>
</template>

<style scoped>
.codex {
  flex: 1;
  overflow-y: auto;
  padding: 10px 10px 0;
}

.load-error {
  margin: 10px;
  color: var(--danger);
  font-size: 12px;
  overflow-wrap: anywhere;
}
</style>
