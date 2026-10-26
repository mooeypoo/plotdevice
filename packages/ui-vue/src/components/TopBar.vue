<script setup lang="ts">
import type { Workspace } from '@plotdevice/contracts'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useVersions } from '../composables/use-versions'
import { documentationFor } from '../links'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'
import AboutDialog from './AboutDialog.vue'
import AppIcon from './AppIcon.vue'
import AppearancePanel from './AppearancePanel.vue'
import BrandMark from './BrandMark.vue'
import MenuButton from './MenuButton.vue'
import SettingsDialog from './SettingsDialog.vue'
import type { MenuItem } from './menu'

// The one bar at the top: the book (its title opens the book menu), Story | Write, and the app menu.
// Every command lives in the app, not in a native menu bar (Milestone 9, decision 6).
const store = useProjectStore()
const settings = useSettingsStore()
const view = useViewStore()
const versions = useVersions()
const t = settings.t
const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)
const about = ref<InstanceType<typeof AboutDialog> | null>(null)
const mod = navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl+'
// The names come only from the catalogs (`workspace-story`, `workspace-write`): the Story label is a working name.
const workspaces: Workspace[] = ['story', 'write']

const bookItems = computed<MenuItem[]>(() => {
  const chapter = view.workspace === 'write' ? view.writingChapter : null
  return [
    { key: 'export-book', label: t('export-book'), run: () => void store.compile() },
    ...(chapter ? [{ key: 'chapter-versions', label: t('chapter-versions'), run: () => versions.show(chapter.file, chapter.name) }] : []),
  ]
})

const appItems = computed<MenuItem[]>(() => [
  { key: 'open-project', label: t('welcome-open-project'), hint: `${mod}O`, run: () => void store.open('choose') },
  { key: 'settings', label: t('settings-open'), hint: `${mod},`, group: 'app', run: () => settingsDialog.value?.show() },
  {
    key: 'documentation',
    label: t('help-documentation'),
    run: () => void window.open(documentationFor(settings.locale), '_blank', 'noreferrer'),
  },
  { key: 'about', label: t('about'), run: () => about.value?.show() },
])

const problem = computed(() => view.saveStatus === 'conflict' || view.saveStatus === 'failed')

function onKey(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
  if (event.key === ',') settingsDialog.value?.show()
  else if (event.key.toLowerCase() === 'o') void store.open('choose')
  else return
  event.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <header class="top-bar">
    <div class="top-start">
      <BrandMark class="brand-mark" />
      <MenuButton
        v-if="store.project"
        :label="t('book-menu')"
        :items="bookItems"
        :heading="store.project.title"
        button-class="title-button"
        testid="book-menu"
      >
        <span class="project-title" dir="auto" :lang="store.project.language">{{ store.project.title }}</span>
        <AppIcon name="chevron" />
      </MenuButton>
      <span v-else class="app-name">{{ t('app-name') }}</span>
    </div>

    <div v-if="store.project" class="segmented workspace-switch" role="group" :aria-label="t('workspace-switch')">
      <button
        v-for="workspace in workspaces"
        :key="workspace"
        type="button"
        :aria-pressed="view.workspace === workspace"
        :data-testid="`workspace-${workspace}`"
        @click="view.workspace = workspace"
      >
        {{ t(`workspace-${workspace}`) }}
      </button>
    </div>
    <span v-else></span>

    <div class="top-end">
      <span
        v-if="store.project && view.workspace === 'write' && view.saveStatus"
        class="save-status"
        :class="{ problem }"
        role="status"
        data-testid="save-status"
        >{{ t(`save-${view.saveStatus}`) }}</span
      >
      <AppearancePanel v-if="store.project && view.workspace === 'write'" />
      <MenuButton :label="t('app-menu')" :items="appItems" button-class="icon-button" align="end" testid="app-menu">
        <AppIcon name="menu" />
      </MenuButton>
    </div>
    <SettingsDialog ref="settingsDialog" />
    <AboutDialog ref="about" />
  </header>
</template>
