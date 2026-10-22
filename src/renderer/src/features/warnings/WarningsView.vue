<script setup lang="ts">
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWarnings } from '../../app/use-warnings'
import { useWorkspaceStore } from '../../app/workspace-store'
import WarningsPanel from './WarningsPanel.vue'

const workspace = useWorkspaceStore()
const editor = useEditorStore()
const manuscript = useManuscriptStore()
const { groups } = useWarnings()
</script>

<template>
  <WarningsPanel
    v-if="workspace.project && groups.length > 0"
    :groups="groups"
    :can-open="editor.canOpen"
    :read-only="workspace.project.readOnly"
    @fix="(path, fix) => manuscript.fixWarning(path, fix)"
    @open="editor.open($event)"
  />
</template>
