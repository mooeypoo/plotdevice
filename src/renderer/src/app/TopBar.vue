<script setup lang="ts">
import { computed } from 'vue'
import type { MessageKey } from '../../../i18n/translator'
import { uiDirection } from '../../../i18n/locales'
import { formatEntryPlaceCrumb, formatEntryPlaceTitle } from '../shared/entry-place-label'
import { isolate } from '../shared/isolate'
import { useChromePresentation } from '../shared/use-chrome-presentation'
import ModeSwitch from '../workbench/shell/ModeSwitch.vue'
import AppMenu from './AppMenu.vue'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { usePaletteStore } from './palette-store'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { useWorkbenchStore, type MainView } from './workbench-store'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
const editor = useEditorStore()
const navigation = useWorkbenchNavigation()
const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const palette = usePaletteStore()
const chrome = useChromePresentation()
const direction = computed(() => uiDirection(language.locale))
const writing = computed(() => workbench.mode === 'writing')

/** Plot's views of the whole story (D1). Write has none: it is the page. */
const PLOT_VIEWS: readonly { view: MainView; label: MessageKey }[] = [
  { view: 'plot-board', label: 'view-board' },
  { view: 'overview', label: 'view-overview' },
  { view: 'timeline', label: 'view-timeline' },
  { view: 'interactions', label: 'view-interactions' }
]

/** Where the page is: the part, then the chapter. The part gives way first when space is short. */
const crumbs = computed((): { text: string; kind: 'part' | 'place' | 'title' }[] => {
  const entry = editor.entry
  if (entry === null) return []
  const part = manuscript.currentPart
  const title = { text: formatEntryPlaceTitle(entry, language.t), kind: 'title' as const }
  return entry.kind === 'chapter' && part !== undefined
    ? [
        { text: part.title, kind: 'part' },
        {
          text: formatEntryPlaceCrumb(entry.label, language.t, chrome.formatNumber),
          kind: 'place'
        },
        title
      ]
    : [title]
})
</script>

<template>
  <header class="top-bar" :dir="direction">
    <span class="project" dir="auto">{{ workspace.project?.title }}</span>

    <nav v-if="writing" class="crumbs" :aria-label="language.t('chrome-location')">
      <template v-for="(crumb, index) in crumbs" :key="index">
        <span
          v-if="index > 0"
          class="separator"
          :class="{ mirrored: direction === 'rtl' }"
          aria-hidden="true"
          >›</span
        >
        <span :class="[crumb.kind, { current: index === crumbs.length - 1 }]" dir="auto">{{
          crumb.text
        }}</span>
      </template>
    </nav>
    <div v-else class="views" role="tablist" :aria-label="language.t('chrome-view')">
      <button
        v-for="tab in PLOT_VIEWS"
        :key="tab.view"
        type="button"
        role="tab"
        :aria-selected="workbench.centerView === tab.view"
        :class="{ on: workbench.centerView === tab.view }"
        @click="navigation.showCenterView(tab.view)"
      >
        {{ language.t(tab.label) }}
      </button>
    </div>

    <span class="spacer"></span>

    <div class="tools">
      <ModeSwitch />
      <button
        type="button"
        class="goto"
        :title="language.t('chrome-goto-tooltip', isolate('Ctrl+K'))"
        @click="palette.show()"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6"></circle>
          <path d="M20 20l-4.5-4.5"></path>
        </svg>
        <span class="goto-label">{{ language.t('palette-title') }}</span>
        <kbd dir="ltr">Ctrl K</kbd>
      </button>
      <button
        type="button"
        class="side"
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
        <span class="side-label" aria-hidden="true">{{ language.t('chrome-binder') }}</span>
      </button>
      <button
        type="button"
        class="side"
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
        <span class="side-label" aria-hidden="true">{{ language.t('chrome-inspector') }}</span>
      </button>
      <button
        v-if="writing"
        type="button"
        class="side"
        :aria-pressed="workbench.focusMode"
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
      <AppMenu />
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-block-size: 44px;
  flex-shrink: 0;
  padding-block: var(--space-2);
  padding-inline: var(--space-5) var(--space-4);
  border-block-end: 1px solid var(--line);
  background: var(--panel);
}

.project {
  flex: none;
  max-inline-size: 16em;
  overflow: hidden;
  color: var(--text-strong);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumbs {
  display: flex;
  gap: var(--space-3);
  min-inline-size: 0;
  overflow: hidden;
  color: var(--text-muted);
  white-space: nowrap;
}

/* The part gives way first, then the chapter's place; the chapter's title stays longest. */
.crumbs .part,
.crumbs .place,
.crumbs .title {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crumbs .part {
  flex-shrink: 100;
}

.crumbs .place {
  flex-shrink: 10;
}

.crumbs .separator {
  flex: none;
}

.crumbs .current {
  color: var(--text);
}

.spacer {
  flex: 1;
}

.views {
  display: flex;
  gap: var(--space-1);
  min-inline-size: 0;
}

.views button {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-small);
  white-space: nowrap;
}

.views button.on {
  background: var(--accent-soft);
  color: var(--text-strong);
}

.tools {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

.goto {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  min-inline-size: 12em;
  block-size: var(--control-height-small);
  margin-inline: var(--space-3);
  padding: 0 var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-field);
  background: var(--bg);
  color: var(--text-muted);
  font-size: var(--text-small);
}

.goto:hover:not(:disabled) {
  background: var(--bg);
  border-color: var(--text-faint);
  color: var(--text);
}

.goto kbd {
  margin-inline-start: auto;
  color: var(--text-faint);
  font: inherit;
  font-size: var(--text-caption);
}

.side {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  block-size: var(--control-height-small);
  padding: 0 var(--space-2);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-small);
}

.side.on {
  background: var(--hover);
  color: var(--text);
}

/* Side toggles carry their names on wide windows; tooltips name them everywhere. */
.side-label {
  display: none;
}

@media (min-width: 1280px) {
  .side-label {
    display: inline;
  }
}

.mirrored {
  transform: scaleX(-1);
}

.directional-icon.mirrored {
  transform-box: view-box;
  transform-origin: center;
}
</style>
