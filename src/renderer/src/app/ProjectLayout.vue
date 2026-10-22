<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import CenterStage from './CenterStage.vue'
import ClassicBody from './ClassicBody.vue'
import DocumentTabs from './DocumentTabs.vue'
import WorkbenchBody from '../workbench/shell/WorkbenchBody.vue'
import { OVERLAYS } from '../workbench/views/view-registry'
import { useWorkbenchStore } from './workbench-store'
import { useInspectorStore } from './inspector-store'
import { useChromePresentation } from '../shared/use-chrome-presentation'
import { useUiLanguageStore } from './ui-language-store'
import { isolate } from '../shared/isolate'
import { lastEntryOf, useLayoutStore } from './layout-store'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import StatusBar from './StatusBar.vue'
import TopBar from './TopBar.vue'
import { useLiveSync } from './use-live-sync'
import { useTypingFade } from './use-typing-fade'
import { useMenuCommands } from './use-menu-commands'
import { useShortcuts } from './use-shortcuts'
import { useWorkspaceStore } from './workspace-store'
import { useWritingPreferencesStore } from './writing-preferences-store'
import { useDocumentTabsStore } from './document-tabs-store'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const codex = useCodexStore()
const editor = useEditorStore()
const layout = useLayoutStore()
const inspector = useInspectorStore()
const writingPreferences = useWritingPreferencesStore()
const tabs = useDocumentTabsStore()
const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const { wordCount } = useChromePresentation()
let disposed = false

useLiveSync()
const fading = useTypingFade()
useMenuCommands()

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
  <div
    class="layout"
    :class="{ focus: layout.focusMode, fading: fading && !layout.focusMode }"
    :style="writingPreferences.proseStyle"
  >
    <TopBar v-if="!layout.focusMode" />

    <component :is="workbench.shell === 'classic' ? ClassicBody : WorkbenchBody" class="body">
      <DocumentTabs v-show="!layout.focusMode" />
      <p v-if="workbench.storageNotice" class="navigation-notice" role="status">
        {{ workbench.storageNotice }}
      </p>
      <p v-if="tabs.storageNotice" class="navigation-notice" role="status">
        {{ tabs.storageNotice }}
      </p>
      <p
        v-if="workspace.rememberErrorMessage"
        class="navigation-notice"
        role="alert"
        data-testid="recents-remember-error"
      >
        {{ workspace.rememberErrorMessage }}
      </p>
      <p
        v-if="workspace.recentsLoadErrorMessage"
        class="navigation-notice error"
        role="alert"
        data-testid="recents-load-error"
      >
        {{ workspace.recentsLoadErrorMessage }}
      </p>
      <p
        v-if="workspace.recentsRemoveErrorMessage"
        class="navigation-notice error"
        role="alert"
        data-testid="recents-remove-error"
      >
        {{ workspace.recentsRemoveErrorMessage }}
      </p>
      <p v-if="editor.actionError" class="navigation-notice error" role="alert">
        {{ editor.actionError }}
      </p>
      <p
        v-if="workspace.folderErrorMessage"
        class="navigation-notice error"
        role="alert"
        data-testid="folder-error"
      >
        {{ workspace.folderErrorMessage }}
      </p>
      <p v-if="workspace.errorMessage" class="navigation-notice error" role="alert" dir="auto">
        {{ workspace.errorMessage }}
      </p>
      <p
        v-if="workspace.refreshErrorMessage"
        class="navigation-notice error"
        role="alert"
        dir="auto"
      >
        {{ workspace.refreshErrorMessage }}
      </p>
      <CenterStage />
    </component>

    <component :is="overlay" v-for="(overlay, index) in OVERLAYS" :key="index" />

    <StatusBar v-if="!layout.focusMode" />

    <div v-else class="focus-chrome">
      <span v-if="editor.entry">{{ wordCount(editor.wordCount) }}</span>
      <button type="button" class="quiet" @click="layout.exitFocusMode()">
        {{ language.t('chrome-leave-focus', isolate('Esc')) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.layout
  :deep(
    :is(.top-bar, .status-bar, .document-navigation, .dock, .shelf, .above, .side, #right-panel)
  ) {
  transition: opacity 400ms ease;
}

/* While the writer types, everything around the page steps back; hovering brings a part back. */
.layout.fading
  :deep(
    :is(.top-bar, .status-bar, .document-navigation, .dock, .shelf, .above, .side, #right-panel)
  ) {
  opacity: 0.12;
}

.layout.fading
  :deep(
    :is(.top-bar, .status-bar, .document-navigation, .dock, .shelf, .above, .side, #right-panel)
  ):is(:hover, :focus-within) {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .layout
    :deep(
      :is(.top-bar, .status-bar, .document-navigation, .dock, .shelf, .above, .side, #right-panel)
    ) {
    transition: none;
  }
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
