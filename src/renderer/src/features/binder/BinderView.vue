<script setup lang="ts">
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useReferenceStore } from '../../app/reference-store'
import { useSidePanelNavigation } from '../../app/use-side-panel-navigation'
import { useWarnings } from '../../app/use-warnings'
import { useWorkspaceStore } from '../../app/workspace-store'
import type { DropRequest } from './binder-drop'
import BinderTree from './BinderTree.vue'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const editor = useEditorStore()
const reference = useReferenceStore()
const { openEntry } = useSidePanelNavigation()
const { count: attentionCount } = useWarnings()

function move(request: DropRequest): void {
  if (request.kind === 'move-part') void manuscript.movePart(request.path, request.index)
  else void manuscript.moveChapter(request.path, request.destination)
}
</script>

<template>
  <p v-if="manuscript.loadError" class="load-error" role="alert" dir="auto">
    {{ manuscript.loadError }}
  </p>
  <BinderTree
    v-if="manuscript.manuscript && workspace.project"
    :project-root="workspace.project.root"
    :manuscript="manuscript.manuscript"
    :selected-path="editor.entry?.path ?? null"
    :attention-count="attentionCount"
    :read-only="workspace.project.readOnly"
    @open="openEntry($event)"
    @reference="reference.open($event)"
    @show-overview="editor.closeEntry()"
    @create-chapter="(part, title) => manuscript.createChapter(part, title)"
    @create-part="manuscript.createPart($event)"
    @move="move"
  />
</template>

<style scoped>
.load-error {
  margin: 10px;
  color: var(--danger);
  font-size: 12px;
  overflow-wrap: anywhere;
}
</style>
