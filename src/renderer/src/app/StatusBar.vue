<script setup lang="ts">
import { computed } from 'vue'
import { formatWordCount } from '../features/binder/binder-labels'
import { useManuscriptStore } from './manuscript-store'
import { useWorkspaceStore } from './workspace-store'

const manuscript = useManuscriptStore()
const workspace = useWorkspaceStore()

const saveLabel = computed(() => {
  if (workspace.project?.readOnly === true) return 'Read-only'
  switch (manuscript.saveState) {
    case 'saved':
      return 'Saved'
    case 'unsaved':
      return 'Editing…'
    case 'saving':
      return 'Saving…'
    case 'conflict':
      return 'Not saved: changed outside'
    case 'error':
      return 'Not saved'
    case 'missing':
      return 'Not saved: file missing'
  }
})

const saveTone = computed(() => {
  if (workspace.project?.readOnly === true) return 'var(--text-muted)'
  if (
    manuscript.saveState === 'conflict' ||
    manuscript.saveState === 'error' ||
    manuscript.saveState === 'missing'
  )
    return 'var(--danger)'
  if (manuscript.saveState === 'saved') return 'var(--ok)'
  return 'var(--warning)'
})
</script>

<template>
  <footer class="status-bar">
    <template v-if="manuscript.entry">
      <span>
        <span class="strong">{{ formatWordCount(manuscript.wordCount) }}</span>
        words in {{ manuscript.entry.kind }}
      </span>
      <span v-if="manuscript.currentPart" dir="auto">
        {{ manuscript.currentPart.title }} {{ formatWordCount(manuscript.currentPart.wordCount) }}
      </span>
    </template>
    <span v-if="manuscript.manuscript">
      Manuscript {{ formatWordCount(manuscript.manuscript.wordCount) }}
    </span>
    <span class="spacer"></span>
    <span v-if="manuscript.entry" class="save" role="status" aria-live="polite">
      <span class="dot" :style="{ background: saveTone }" aria-hidden="true"></span>
      {{ saveLabel }}
    </span>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 30px;
  flex-shrink: 0;
  padding: 0 18px;
  border-top: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.strong {
  color: var(--text);
}

.spacer {
  flex: 1;
}

.save {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: background 200ms ease;
}
</style>
