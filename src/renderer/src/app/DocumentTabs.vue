<script setup lang="ts">
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useDocumentTabs } from './use-document-tabs'
import { isolate } from '../shared/isolate'
import { navigateTabs } from '../shared/tab-navigation'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore } from './workbench-store'

const tabs = useDocumentTabsStore()
const editor = useEditorStore()
const language = useUiLanguageStore()
const { documents, active, busy, canWriteHere, activateTab, returnToWriting } = useDocumentTabs()
const workbench = useWorkbenchStore()
const navigation = useWorkbenchNavigation()

/** Shows this document beside the Writing one, and returns the editor to Writing. */
async function openBeside(path: string): Promise<void> {
  if (await navigation.openBeside(path)) await returnToWriting()
}
</script>

<template>
  <section
    v-if="documents.length > 0"
    class="document-navigation"
    :aria-label="language.t('tabs-open-documents')"
  >
    <div
      class="tab-strip"
      role="tablist"
      :aria-label="language.t('tabs-document-list')"
      @keydown="navigateTabs"
    >
      <div
        v-for="tab in documents"
        :key="tab.id"
        class="tab-group"
        :class="{ active: tab.active, writing: tab.writing }"
      >
        <button
          :id="`tab-${tab.id}`"
          type="button"
          role="tab"
          class="document-tab"
          :aria-selected="tab.active"
          aria-controls="document-editor"
          :tabindex="
            (editor.entry?.path ?? tabs.activePath ?? documents[0]?.path) === tab.path ? 0 : -1
          "
          :data-document-active="tab.active"
          :title="tab.path"
          :disabled="busy"
          @click="activateTab(tab.path, $event)"
          @dblclick="tabs.keep(tab.path)"
        >
          <span v-if="tab.writing" class="tab-state">{{ language.t('tabs-writing') }}</span>
          <bdi class="tab-title">{{ tab.title }}</bdi>
          <span v-if="tab.pinned" class="tab-state">{{ language.t('tabs-pinned') }}</span>
          <span v-else-if="tab.temporary" class="tab-state preview">
            {{ language.t('tabs-preview') }}
          </span>
          <span v-if="tab.unavailable" class="missing">{{ language.t('tabs-missing') }}</span>
        </button>
        <button
          v-if="tabs.canClose(tab.path)"
          type="button"
          class="close"
          :disabled="busy"
          :aria-label="language.t('tabs-close-label', isolate(tab.title))"
          @click="editor.closeDocument(tab.path)"
        >
          ×
        </button>
      </div>
    </div>
    <div class="document-actions">
      <button
        v-if="tabs.writingPath"
        type="button"
        class="return"
        :disabled="busy"
        :title="language.t('tabs-return-title', isolate('Ctrl+Shift+Enter'))"
        @click="returnToWriting"
      >
        {{ language.t('tabs-return') }}
      </button>
      <template v-if="active">
        <button
          v-if="active.temporary"
          type="button"
          :disabled="busy"
          @click="tabs.keep(active.path)"
        >
          {{ language.t('tabs-keep-open') }}
        </button>
        <button
          type="button"
          :disabled="busy"
          :aria-pressed="active.pinned"
          :title="
            active.writing
              ? language.t('tabs-writing-pin-tooltip')
              : language.t('tabs-pin-tooltip')
          "
          @click="tabs.togglePin(active.path)"
        >
          {{ active.pinned ? language.t('tabs-unpin') : language.t('tabs-pin') }}
        </button>
        <button
          v-if="canWriteHere && !active.writing"
          type="button"
          :disabled="busy"
          @click="tabs.writeHere(active.path)"
        >
          {{ language.t('tabs-write-here') }}
        </button>
        <button
          v-if="workbench.shell === 'workbench' && tabs.writingPath && !active.writing"
          type="button"
          class="beside"
          :disabled="busy"
          :aria-label="language.t('split-open-beside-label', isolate(active.title))"
          @click="openBeside(active.path)"
        >
          {{ language.t('split-open-beside') }}
        </button>
        <button
          type="button"
          :disabled="busy"
          :title="language.t('tabs-close-other-tooltip')"
          @click="editor.closeOtherDocuments()"
        >
          {{ language.t('tabs-close-other-unpinned') }}
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.document-navigation {
  flex-shrink: 0;
  min-width: 0;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}
.tab-strip {
  display: flex;
  overflow-x: auto;
  scrollbar-width: thin;
}
.tab-group {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  border-inline-end: 1px solid var(--line);
  border-bottom: 2px solid transparent;
}
.tab-group.active {
  border-bottom-color: var(--accent);
  background: var(--active);
}
.tab-group.writing {
  order: -1;
}
.document-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 37px;
  max-width: 300px;
  padding: 8px 12px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-dim);
  font-size: 12px;
}
.tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.active .tab-title {
  color: var(--text-strong);
}
.tab-state {
  flex-shrink: 0;
  color: var(--accent);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.preview {
  color: var(--text-muted);
}
.missing {
  color: var(--danger);
  font-size: 10px;
}
.close {
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
}
.document-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 5px 12px;
}
.document-actions button {
  padding: 3px 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
}
.document-actions .return {
  color: var(--accent);
}
.document-actions button:hover,
.close:hover {
  color: var(--text-strong);
}
</style>
