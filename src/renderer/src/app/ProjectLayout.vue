<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import BinderTree from '../features/binder/BinderTree.vue'
import EditorPane from '../features/editor/EditorPane.vue'
import { formatWordCount } from '../features/binder/binder-labels'
import { lastEntryOf, rememberLastEntry, useLayoutStore } from './layout-store'
import { useManuscriptStore } from './manuscript-store'
import StatusBar from './StatusBar.vue'
import TopBar from './TopBar.vue'
import { useShortcuts } from './use-shortcuts'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const layout = useLayoutStore()

const attentionCount = computed(
  () =>
    (workspace.project?.problems.length ?? 0) +
    (workspace.project?.warnings.length ?? 0) +
    (manuscript.manuscript?.warnings.length ?? 0)
)

onMounted(async () => {
  await manuscript.load()
  const root = workspace.project?.root
  const last = root === undefined ? undefined : lastEntryOf(root)
  if (last !== undefined && manuscript.hasEntry(last)) await manuscript.open(last)
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
        @open="manuscript.open($event)"
        @show-overview="manuscript.closeEntry()"
      />
      <main class="main">
        <EditorPane />
      </main>
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
