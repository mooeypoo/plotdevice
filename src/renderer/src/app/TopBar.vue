<script setup lang="ts">
import Wordmark from '../shared/Wordmark.vue'
import { computed } from 'vue'
import { useLayoutStore } from './layout-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { useWorkspaceStore } from './workspace-store'
import { useUiLanguageStore } from './ui-language-store'
import LanguageSelector from '../shared/LanguageSelector.vue'
import { isolate } from '../shared/isolate'
import { formatEntryPlaceCrumb, formatEntryPlaceTitle } from '../shared/entry-place-label'
import { useChromePresentation } from '../shared/use-chrome-presentation'
import { uiDirection } from '../../../i18n/locales'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const editor = useEditorStore()
const layout = useLayoutStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const direction = computed(() => uiDirection(language.locale))

const crumbs = computed(() => {
  if (layout.mainView === 'overview') return [language.t('view-overview')]
  if (layout.mainView === 'timeline') return [language.t('view-timeline')]
  if (layout.mainView === 'interactions') return [language.t('view-interactions')]
  const entry = editor.entry
  if (entry === null) return []
  const part = manuscript.currentPart
  const chapterOfPart = entry.kind === 'chapter' && part !== undefined
  return chapterOfPart
    ? [
        part.title,
        formatEntryPlaceCrumb(entry.label, language.t, chrome.formatNumber),
        formatEntryPlaceTitle(entry, language.t)
      ]
    : [formatEntryPlaceTitle(entry, language.t)]
})
</script>

<template>
  <header class="top-bar" :dir="direction">
    <div class="identity">
      <span class="mark"><Wordmark /></span>
      <span class="project" dir="auto">{{ workspace.project?.title }}</span>
    </div>

    <nav class="crumbs" :aria-label="language.t('chrome-location')">
      <template v-for="(crumb, index) in crumbs" :key="index">
        <span
          v-if="index > 0"
          class="separator"
          :class="{ mirrored: direction === 'rtl' }"
          aria-hidden="true"
          >›</span
        >
        <span :class="{ current: index === crumbs.length - 1 }" dir="auto">{{ crumb }}</span>
      </template>
    </nav>

    <div class="tools">
      <div class="views" role="tablist" :aria-label="language.t('chrome-view')">
        <button
          type="button"
          role="tab"
          :aria-selected="layout.mainView === 'write'"
          :class="{ on: layout.mainView === 'write' }"
          @click="layout.mainView = 'write'"
        >
          {{ language.t('view-write') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="layout.mainView === 'overview'"
          :class="{ on: layout.mainView === 'overview' }"
          @click="layout.mainView = 'overview'"
        >
          {{ language.t('view-overview') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="layout.mainView === 'timeline'"
          :class="{ on: layout.mainView === 'timeline' }"
          @click="layout.mainView = 'timeline'"
        >
          {{ language.t('view-timeline') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="layout.mainView === 'interactions'"
          :class="{ on: layout.mainView === 'interactions' }"
          @click="layout.mainView = 'interactions'"
        >
          {{ language.t('view-interactions') }}
        </button>
      </div>
      <span class="divider" aria-hidden="true"></span>
      <button
        type="button"
        class="icon"
        :class="{ on: layout.binderOpen }"
        :aria-pressed="layout.binderOpen"
        :aria-label="language.t('chrome-binder')"
        :title="language.t('chrome-binder-tooltip', isolate('Ctrl+\\'))"
        @click="layout.toggleBinder()"
      >
        <svg
          class="directional-icon"
          :class="{ mirrored: direction === 'rtl' }"
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
        :aria-label="language.t('chrome-inspector')"
        :title="language.t('chrome-inspector-tooltip', isolate('Ctrl+Shift+I'))"
        @click="layout.toggleInspector()"
      >
        <svg
          class="directional-icon"
          :class="{ mirrored: direction === 'rtl' }"
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
        :aria-label="language.t('chrome-focus')"
        :title="language.t('chrome-focus-tooltip', isolate('Ctrl+Shift+F'))"
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
      <LanguageSelector />
      <button type="button" class="quiet close" @click="workspace.backToWelcome()">
        {{ language.t('close-project') }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 46px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding-block: 4px;
  padding-inline: 18px 12px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.identity {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.mark {
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

.views {
  display: flex;
  padding: 2px;
  border-radius: 8px;
  background: var(--raised);
}

.views button {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
}

.views button.on {
  background: var(--active);
  color: var(--text-strong);
}

.tools {
  display: flex;
  flex-wrap: wrap;
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

.mirrored {
  transform: scaleX(-1);
}

.directional-icon.mirrored {
  transform-box: view-box;
  transform-origin: center;
}
</style>
