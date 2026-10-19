<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import BinderTree from '../features/binder/BinderTree.vue'
import EditorPane from '../features/editor/EditorPane.vue'
import InspectorPanel from '../features/inspector/InspectorPanel.vue'
import { useInspectorStore } from './inspector-store'
import { formatWordCount } from '../features/binder/binder-labels'
import type { DropRequest } from '../features/binder/binder-drop'
import { lastEntryOf, rememberLastEntry, useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import StatusBar from './StatusBar.vue'
import TopBar from './TopBar.vue'
import { useWarnings } from '../features/warnings/use-warnings'
import { useLiveSync } from './use-live-sync'
import { useShortcuts } from './use-shortcuts'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const layout = useLayoutStore()
const inspector = useInspectorStore()

useLiveSync()

function move(request: DropRequest): void {
  if (request.kind === 'move-part') void manuscript.movePart(request.path, request.index)
  else void manuscript.moveChapter(request.path, request.destination)
}

const { count: attentionCount } = useWarnings()

onMounted(async () => {
  void inspector.loadVocabulary()
  await manuscript.load()
  const root = workspace.project?.root
  const last = root === undefined ? undefined : lastEntryOf(root)
  if (last !== undefined && manuscript.hasEntry(last)) await manuscript.open(last)
})

onBeforeUnmount(() => {
  inspector.clear()
})

watch(
  () => manuscript.entry?.path ?? null,
  (path) => {
    const root = workspace.project?.root
    if (root !== undefined) rememberLastEntry(root, path)
  }
)

useShortcuts([
  {
    key: '\\',
    mod: true,
    run: () => {
      layout.toggleBinder()
    }
  },
  {
    key: 'f',
    mod: true,
    shift: true,
    run: () => {
      layout.toggleFocusMode()
    }
  },
  {
    key: 'i',
    mod: true,
    shift: true,
    run: () => {
      layout.toggleInspector()
    }
  },
  {
    key: 'Escape',
    run: () => {
      layout.exitFocusMode()
    }
  },
  {
    key: 's',
    mod: true,
    run: () => {
      void manuscript.flush()
    }
  }
])
</script>

<template>
  <div class="layout" :class="{ focus: layout.focusMode }">
    <TopBar v-if="!layout.focusMode" />

    <div class="body">
      <BinderTree
        v-if="layout.binderOpen && !layout.focusMode && manuscript.manuscript"
        :manuscript="manuscript.manuscript"
        :selected-path="manuscript.entry?.path ?? null"
        :attention-count="attentionCount"
        :read-only="workspace.project?.readOnly ?? false"
        @open="manuscript.open($event)"
        @show-overview="manuscript.closeEntry()"
        @create-chapter="(part, title) => manuscript.createChapter(part, title)"
        @create-part="manuscript.createPart($event)"
        @move="move"
      />
      <main class="main">
        <EditorPane />
      </main>
      <InspectorPanel v-if="layout.inspectorOpen && !layout.focusMode && manuscript.entry" />
    </div>

    <StatusBar v-if="!layout.focusMode" />

    <div v-else class="focus-chrome">
      <span v-if="manuscript.entry">{{ formatWordCount(manuscript.wordCount) }} words</span>
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
