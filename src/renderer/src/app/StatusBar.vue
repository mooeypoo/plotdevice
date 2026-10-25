<script setup lang="ts">
import { computed } from 'vue'
import { useChromePresentation } from '../shared/use-chrome-presentation'
import { useUiLanguageStore } from './ui-language-store'
import { isolate } from '../shared/isolate'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { useWorkspaceStore } from './workspace-store'
import { useWarnings } from './use-warnings'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import WritingAppearance from './WritingAppearance.vue'

const manuscript = useManuscriptStore()
const editor = useEditorStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const { formatNumber, documentCount } = useChromePresentation()
const warnings = useWarnings()
const navigation = useWorkbenchNavigation()

const manuscriptCount = computed(() =>
  manuscript.manuscript
    ? language.t(
        'chrome-count-manuscript',
        manuscript.manuscript.wordCount,
        formatNumber(manuscript.manuscript.wordCount)
      )
    : ''
)
/** The wider counts, a hover away: the part this chapter is in, and the whole manuscript. */
const widerCounts = computed(() => {
  const part = manuscript.currentPart
  return [
    part
      ? language.t(
          'chrome-count-named-part',
          part.wordCount,
          isolate(part.title),
          formatNumber(part.wordCount)
        )
      : '',
    manuscriptCount.value
  ]
    .filter((count) => count !== '')
    .join(' · ')
})
const attention = computed(() =>
  language.t('binder-attention', warnings.count.value, formatNumber(warnings.count.value))
)

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
    <span v-if="editor.entry" class="count" :title="widerCounts">{{
      documentCount(editor.wordCount, editor.entry.kind)
    }}</span>
    <span v-else-if="manuscript.manuscript" class="count">{{ manuscriptCount }}</span>
    <span class="spacer"></span>
    <button
      v-if="warnings.count.value > 0"
      type="button"
      class="quiet attention"
      :aria-label="attention"
      :title="attention"
      @click="navigation.revealView('warnings')"
    >
      <span aria-hidden="true">⚠ {{ formatNumber(warnings.count.value) }}</span>
    </button>
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
  gap: var(--space-5);
  height: 30px;
  flex-shrink: 0;
  padding: 0 18px;
  border-top: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-muted);
  font-size: var(--text-small);
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.attention {
  padding: var(--space-1) var(--space-3);
  color: var(--warning);
  font-size: var(--text-small);
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
