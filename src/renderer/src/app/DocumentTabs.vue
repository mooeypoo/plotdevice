<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useDocumentTabs } from './use-document-tabs'
import { isolate } from '../shared/isolate'
import MenuButton from '../shared/MenuButton.vue'
import type { MenuItem } from '../shared/menu-item'
import { navigateTabs } from '../shared/tab-navigation'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore } from './workbench-store'

const tabs = useDocumentTabsStore()
const editor = useEditorStore()
const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const { documents, active, busy, canWriteHere, activateTab, returnToWriting } = useDocumentTabs()
const navigation = useWorkbenchNavigation()

/** Tabs earn their row only once there is more than one document to switch between (F6). */
const showStrip = computed(() => documents.value.length > 1)
/** The page shows something other than your chapter, so there is somewhere to go back to. */
const away = computed(
  () =>
    tabs.writingPath !== null &&
    (workbench.centerView !== 'write' || editor.entry?.path !== tabs.writingPath)
)

/** Shows this document beside the Writing one, and returns the editor to Writing. */
async function openBeside(path: string): Promise<void> {
  if (await navigation.openBeside(path)) await returnToWriting()
}

/** What can be done with the open document, one step away in its ⋯. */
const actions = computed((): MenuItem[] => {
  const tab = active.value
  if (tab === undefined) return []
  return [
    ...(tab.temporary
      ? [
          {
            key: 'keep',
            label: language.t('tabs-keep-open'),
            run: () => {
              tabs.keep(tab.path)
            }
          }
        ]
      : []),
    {
      key: 'pin',
      label: tab.pinned ? language.t('tabs-unpin') : language.t('tabs-pin'),
      run: () => {
        tabs.togglePin(tab.path)
      }
    },
    ...(canWriteHere.value && !tab.writing
      ? [
          {
            key: 'write-here',
            label: language.t('tabs-write-here'),
            run: () => {
              tabs.writeHere(tab.path)
            }
          }
        ]
      : []),
    ...(tabs.writingPath !== null && !tab.writing
      ? [
          {
            key: 'beside',
            label: language.t('split-open-beside'),
            run: () => void openBeside(tab.path)
          }
        ]
      : []),
    {
      key: 'close-others',
      label: language.t('tabs-close-other-unpinned'),
      separator: true,
      run: () => void editor.closeOtherDocuments()
    }
  ]
})
</script>

<template>
  <section
    v-if="showStrip || away"
    class="document-navigation"
    :aria-label="language.t('tabs-open-documents')"
  >
    <div
      v-if="showStrip"
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
        v-if="away"
        type="button"
        class="return"
        :disabled="busy"
        :title="language.t('tabs-return-title', isolate('Ctrl+Shift+Enter'))"
        @click="returnToWriting"
      >
        {{ language.t('tabs-return') }}
      </button>
      <MenuButton
        v-if="showStrip && active && workbench.centerView === 'write'"
        class="tab-actions"
        :label="language.t('tabs-actions', isolate(active.title))"
        :items="actions"
      />
    </div>
  </section>
</template>

<style scoped>
.document-navigation {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  min-width: 0;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}
.tab-strip {
  display: flex;
  flex: 1;
  min-width: 0;
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
  gap: var(--space-3);
  min-height: 37px;
  max-width: 300px;
  padding: var(--space-3) var(--space-4);
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-dim);
  font-size: var(--text-small);
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
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.preview {
  color: var(--text-muted);
}
.missing {
  color: var(--danger);
  font-size: var(--text-caption);
}
.close {
  padding: var(--space-3) var(--space-3);
  border: none;
  background: transparent;
  color: var(--text-muted);
}
.document-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
  margin-inline-start: auto;
  padding: var(--space-2) var(--space-4);
}
/* One pill back to your chapter, only while the page shows something else. */
.document-actions .return {
  padding: var(--space-1) var(--space-4);
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
  background: var(--accent-soft);
  color: var(--text-strong);
  font-size: var(--text-small);
}
.close:hover {
  color: var(--text-strong);
}
</style>
