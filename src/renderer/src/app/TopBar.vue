<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from './layout-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const editor = useEditorStore()
const layout = useLayoutStore()

const crumbs = computed(() => {
  const entry = editor.entry
  if (entry === null) return []
  const part = manuscript.currentPart
  const chapterOfPart = entry.kind === 'chapter' && part !== undefined
  return chapterOfPart
    ? [part.title, entry.label.split(' · ').pop() ?? '', entry.title]
    : [entry.title]
})
</script>

<template>
  <header class="top-bar">
    <div class="identity">
      <span class="wordmark">Plot<span class="dot">·</span>Device</span>
      <span class="project" dir="auto">{{ workspace.project?.title }}</span>
    </div>

    <nav class="crumbs" aria-label="Location">
      <template v-for="(crumb, index) in crumbs" :key="index">
        <span v-if="index > 0" class="separator" aria-hidden="true">›</span>
        <span :class="{ current: index === crumbs.length - 1 }" dir="auto">{{ crumb }}</span>
      </template>
    </nav>

    <div class="tools">
      <button
        type="button"
        class="icon"
        :class="{ on: layout.binderOpen }"
        :aria-pressed="layout.binderOpen"
        aria-label="Binder"
        title="Binder (Ctrl+\)"
        @click="layout.toggleBinder()"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2.5"></rect>
          <path d="M9 4v16"></path>
        </svg>
      </button>
      <button
        type="button"
        class="icon"
        :class="{ on: layout.inspectorOpen }"
        :aria-pressed="layout.inspectorOpen"
        aria-label="Inspector"
        title="Inspector (Ctrl+Shift+I)"
        @click="layout.toggleInspector()"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2.5"></rect>
          <path d="M15 4v16"></path>
        </svg>
      </button>
      <span class="divider" aria-hidden="true"></span>
      <button
        type="button"
        class="icon"
        aria-label="Focus mode"
        title="Focus mode (Ctrl+Shift+F)"
        @click="layout.toggleFocusMode()"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 9V5h4"></path>
          <path d="M20 9V5h-4"></path>
          <path d="M4 15v4h4"></path>
          <path d="M20 15v4h-4"></path>
        </svg>
      </button>
      <button type="button" class="quiet close" @click="workspace.backToWelcome()">
        Close project
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 46px;
  flex-shrink: 0;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.identity {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.wordmark {
  font-size: 16px;
}

.project {
  overflow: hidden;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumbs {
  display: flex;
  flex: 1;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  color: var(--text-muted);
  white-space: nowrap;
}

.crumbs .current {
  color: var(--text);
}

.tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
}

.icon.on {
  background: var(--active);
  color: var(--text);
}

.divider {
  width: 1px;
  height: 20px;
  margin: 0 6px;
  background: var(--line-strong);
}

.close {
  margin-inline-start: 6px;
  padding: 7px 12px;
  font-size: 12px;
}
</style>
