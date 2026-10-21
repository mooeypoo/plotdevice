<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import EditorPane from '../features/editor/EditorPane.vue'
import { useInspectorStore } from './inspector-store'
import { formatWordCount } from '../features/binder/binder-labels'
import type { DropRequest } from '../features/binder/binder-drop'
import { lastEntryOf, useLayoutStore } from './layout-store'
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
import { useDocumentTabsStore } from './document-tabs-store'
import DocumentTabs from './DocumentTabs.vue'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const codex = useCodexStore()
const editor = useEditorStore()
const layout = useLayoutStore()
const inspector = useInspectorStore()
const writingPreferences = useWritingPreferencesStore()
const tabs = useDocumentTabsStore()
let disposed = false

useLiveSync()
useMenuCommands()

function move(request: DropRequest): void {
  if (request.kind === 'move-part') void manuscript.movePart(request.path, request.index)
  else void manuscript.moveChapter(request.path, request.destination)
}

const { count: attentionCount } = useWarnings()

onMounted(async () => {
  const root = workspace.project?.root
  void inspector.loadVocabulary()
  await Promise.all([manuscript.load(), codex.load()])
  if (disposed || root === undefined || workspace.project?.root !== root) return
  tabs.restore(root)
  const last = tabs.activePath ?? lastEntryOf(root)
  if (last !== undefined && editor.canOpen(last)) await editor.open(last)
})

onBeforeUnmount(() => {
  disposed = true
  inspector.clear()
})

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
        <DocumentTabs v-show="!layout.focusMode" />
        <p v-if="tabs.storageNotice" class="navigation-notice" role="status">
          {{ tabs.storageNotice }}
        </p>
        <p v-if="editor.actionError" class="navigation-notice error" role="alert">
          {{ editor.actionError }}
        </p>
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
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.main :deep(.pane) {
  flex: 1;
  min-height: 0;
}

.navigation-notice {
  margin: 0;
  padding: 8px 16px;
  color: var(--text-muted);
  font-size: 12px;
}
.navigation-notice.error {
  color: var(--danger);
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
