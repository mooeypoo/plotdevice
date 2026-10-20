<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import EditorPane from '../features/editor/EditorPane.vue'
import { useInspectorStore } from './inspector-store'
import { formatWordCount } from '../features/binder/binder-labels'
import type { DropRequest } from '../features/binder/binder-drop'
import { lastEntryOf, rememberLastEntry, useLayoutStore } from './layout-store'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import RightPanel from './RightPanel.vue'
import SidePanel from './SidePanel.vue'
import StatusBar from './StatusBar.vue'
import TopBar from './TopBar.vue'
import { useWarnings } from '../features/warnings/use-warnings'
import { useLiveSync } from './use-live-sync'
import { useMenuCommands } from './use-menu-commands'
import { useShortcuts } from './use-shortcuts'
import { useWorkspaceStore } from './workspace-store'
import { useWritingPreferencesStore } from './writing-preferences-store'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const codex = useCodexStore()
const editor = useEditorStore()
const layout = useLayoutStore()
const inspector = useInspectorStore()
const writingPreferences = useWritingPreferencesStore()

useLiveSync()
useMenuCommands()

function move(request: DropRequest): void {
  if (request.kind === 'move-part') void manuscript.movePart(request.path, request.index)
  else void manuscript.moveChapter(request.path, request.destination)
}

const { count: attentionCount } = useWarnings()

onMounted(async () => {
  void inspector.loadVocabulary()
  await Promise.all([manuscript.load(), codex.load()])
  const root = workspace.project?.root
  const last = root === undefined ? undefined : lastEntryOf(root)
  if (last !== undefined && editor.canOpen(last)) await editor.open(last)
})

onBeforeUnmount(() => {
  inspector.clear()
})

watch(
  () => editor.entry?.path ?? null,
  (path) => {
    const root = workspace.project?.root
    if (root !== undefined) rememberLastEntry(root, path)
  }
)

useShortcuts([
  {
    key: 'Escape',
    preventDefault: false,
    run: () => {
      layout.exitFocusMode()
    }
  },
  {
    key: 's',
    mod: true,
    run: () => {
      void editor.flush()
    }
  }
])
</script>

<template>
  <div class="layout" :class="{ focus: layout.focusMode }" :style="writingPreferences.proseStyle">
    <TopBar v-if="!layout.focusMode" />

    <div class="body">
      <SidePanel
        v-if="layout.binderOpen && !layout.focusMode"
        :attention-count="attentionCount"
        @move="move"
      />
      <main class="main">
        <EditorPane />
      </main>
      <RightPanel v-if="layout.inspectorOpen && !layout.focusMode" />
    </div>

    <StatusBar v-if="!layout.focusMode" />

    <div v-else class="focus-chrome">
      <span v-if="editor.entry">{{ formatWordCount(editor.wordCount) }} words</span>
      <button type="button" class="quiet" @click="layout.exitFocusMode()">Leave focus (Esc)</button>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.main {
  flex: 1;
  min-width: 0;
}

.focus-chrome {
  position: fixed;
  top: 14px;
  inset-inline-end: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 12px;
  opacity: 0.6;
  transition: opacity 200ms ease;
}

.focus-chrome:hover {
  opacity: 1;
}
</style>
