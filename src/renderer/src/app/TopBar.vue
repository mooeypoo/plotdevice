<script setup lang="ts">
import Wordmark from '../shared/Wordmark.vue'
import { computed } from 'vue'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore } from './workbench-store'
import LayoutSwitcher from '../workbench/shell/LayoutSwitcher.vue'
import ModeSwitch from '../workbench/shell/ModeSwitch.vue'
import type { MessageKey } from '../../../i18n/translator'
import type { MainView } from './workbench-store'
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
const navigation = useWorkbenchNavigation()
const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const direction = computed(() => uiDirection(language.locale))

/**
 * The main area's views. In Plotting mode the board comes first and the editor tab shows the
 * outline's text, so the board and the text are never both on screen (brief §4.4).
 */
const viewTabs = computed(
  (): readonly { view: MainView; label: MessageKey; show: () => Promise<boolean> }[] => {
    const books = (['overview', 'timeline', 'interactions'] as const).map((view) => ({
      view,
      label: `view-${view}` as const,
      show: () => navigation.showCenterView(view)
    }))
    if (workbench.mode === 'plotting') {
      return [
        {
          view: 'plot-board',
          label: 'view-board',
          show: () => navigation.showCenterView('plot-board')
        },
        { view: 'write', label: 'view-outline-text', show: () => navigation.showOutlineText() },
        ...books
      ]
    }
    return [
      { view: 'write', label: 'view-write', show: () => navigation.showCenterView('write') },
      ...books
    ]
  }
)

const crumbs = computed(() => {
  if (workbench.centerView === 'overview') return [language.t('view-overview')]
  if (workbench.centerView === 'timeline') return [language.t('view-timeline')]
  if (workbench.centerView === 'interactions') return [language.t('view-interactions')]
  if (workbench.centerView === 'plot-board') return [language.t('view-board')]
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
      <ModeSwitch />
      <div class="views" role="tablist" :aria-label="language.t('chrome-view')">
        <button
          v-for="tab in viewTabs"
          :key="tab.view"
          type="button"
          role="tab"
          :aria-selected="workbench.centerView === tab.view"
          :class="{ on: workbench.centerView === tab.view }"
          @click="tab.show()"
        >
          {{ language.t(tab.label) }}
        </button>
      </div>
      <LayoutSwitcher />
      <span class="divider" aria-hidden="true"></span>
      <button
        type="button"
        class="icon"
        :class="{ on: navigation.isAreaOpen('binder') }"
        :aria-pressed="navigation.isAreaOpen('binder')"
        :aria-label="language.t('chrome-binder')"
        :title="language.t('chrome-binder-tooltip', isolate('Ctrl+\\'))"
        @click="navigation.toggleArea('binder')"
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
        :class="{ on: navigation.isAreaOpen('properties') }"
        :aria-pressed="navigation.isAreaOpen('properties')"
        :aria-label="language.t('chrome-inspector')"
        :title="language.t('chrome-inspector-tooltip', isolate('Ctrl+Shift+I'))"
        @click="navigation.toggleArea('properties')"
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
        @click="workbench.toggleFocusMode()"
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
