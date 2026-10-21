<script setup lang="ts">
import { computed } from 'vue'
import { useChromePresentation } from '../shared/use-chrome-presentation'
import { useUiLanguageStore } from './ui-language-store'
import { isolate } from '../shared/isolate'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { useWorkspaceStore } from './workspace-store'
import WritingAppearance from './WritingAppearance.vue'

const manuscript = useManuscriptStore()
const editor = useEditorStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const { formatNumber, documentCount } = useChromePresentation()

const saveLabel = computed(() => {
  if (workspace.project?.readOnly === true) return language.t('chrome-save-read-only')
  switch (editor.saveState) {
    case 'saved':
      return language.t('chrome-save-saved')
    case 'unsaved':
      return language.t('chrome-save-unsaved')
    case 'saving':
      return language.t('chrome-save-saving')
    case 'conflict':
      return language.t('chrome-save-conflict')
    case 'error':
      return language.t('chrome-save-error')
    case 'missing':
      return language.t('chrome-save-missing')
  }
})

const saveTone = computed(() => {
  if (workspace.project?.readOnly === true) return 'var(--text-muted)'
  if (
    editor.saveState === 'conflict' ||
    editor.saveState === 'error' ||
    editor.saveState === 'missing'
  )
    return 'var(--danger)'
  if (editor.saveState === 'saved') return 'var(--ok)'
  return 'var(--warning)'
})
</script>

<template>
  <footer class="status-bar">
    <template v-if="editor.entry">
      <span>{{ documentCount(editor.wordCount, editor.entry.kind) }}</span>
      <span v-if="manuscript.currentPart">
        {{
          language.t(
            'chrome-count-named-part',
            manuscript.currentPart.wordCount,
            isolate(manuscript.currentPart.title),
            formatNumber(manuscript.currentPart.wordCount)
          )
        }}
      </span>
    </template>
    <span v-if="manuscript.manuscript">
      {{
        language.t(
          'chrome-count-manuscript',
          manuscript.manuscript.wordCount,
          formatNumber(manuscript.manuscript.wordCount)
        )
      }}
    </span>
    <span class="spacer"></span>
    <WritingAppearance />
    <span v-if="editor.entry" class="save" role="status" aria-live="polite">
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
