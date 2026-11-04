<script setup lang="ts">
import type { AppInfo, Workspace } from '@plotdevice/contracts'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApi } from '../api'
import { useVersions } from '../composables/use-versions'
import { documentationFor, IDEA_FORM, problemReportFor } from '../links'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'
import AboutDialog from './AboutDialog.vue'
import AppIcon from './AppIcon.vue'
import AppearancePanel from './AppearancePanel.vue'
import BrandMark from './BrandMark.vue'
import MenuButton from './MenuButton.vue'
import SettingsDialog from './SettingsDialog.vue'
import UpdateNotice from './UpdateNotice.vue'
import type { MenuItem } from './menu'

// The one bar at the top: the book (its title opens the book menu), Story | Write, and the app menu.
// Every command lives in the app, not in a native menu bar (Milestone 9, decision 6).
const store = useProjectStore()
const settings = useSettingsStore()
const view = useViewStore()
const story = useStoryStore()
const versions = useVersions()
const t = settings.t
const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)
const about = ref<InstanceType<typeof AboutDialog> | null>(null)
const mod = navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl+'
// For the problem form, which is filled in with the version and system.
const appInfo = ref<AppInfo | null>(null)
void useApi()
  .getAppInfo()
  .then((info) => (appInfo.value = info))
const openInBrowser = (url: string): void => void window.open(url, '_blank', 'noreferrer')
// The names come only from the catalogs (`workspace-story`, `workspace-write`): the Story label is a working name.
const workspaces: Workspace[] = ['story', 'write']

const bookItems = computed<MenuItem[]>(() => {
  const chapter = view.workspace === 'write' ? view.writingChapter : null
  return [
    { key: 'export-book', label: t('export-book'), run: () => void store.compile() },
    { key: 'kinds', label: t('kinds-menu'), run: () => (view.kindsDialog = true) },
    ...(store.renamedFolders ? [{ key: 'undo-folders', label: t('folders-undo'), run: () => void undoFolders() }] : []),
    ...(chapter ? [{ key: 'chapter-versions', label: t('chapter-versions'), run: () => versions.show(chapter.file, chapter.name) }] : []),
  ]
})

async function undoFolders(): Promise<void> {
  const back = await store.undoFolderRenames()
  if (back) await story.followFolders(back)
}

const appItems = computed<MenuItem[]>(() => [
  { key: 'open-project', label: t('welcome-open-project'), hint: `${mod}O`, run: () => void store.open('choose') },
  { key: 'settings', label: t('settings-open'), hint: `${mod},`, group: 'app', run: () => settingsDialog.value?.show() },
  { key: 'documentation', label: t('help-documentation'), run: () => openInBrowser(documentationFor(settings.locale)) },
  {
    key: 'report-problem',
    label: t('report-problem'),
    run: () => openInBrowser(problemReportFor(appInfo.value?.version ?? '', appInfo.value?.platform ?? '')),
  },
  { key: 'suggest-idea', label: t('suggest-idea'), run: () => openInBrowser(IDEA_FORM) },
  { key: 'about', label: t('about'), run: () => about.value?.show() },
])

/** Write's chapter, or the page or outline text open in Story; Story's board and gallery save as they change. */
const status = computed(() => (view.workspace === 'write' ? view.saveStatus : (view.storySaveStatus ?? 'saved')))
const problem = computed(() => status.value === 'conflict' || status.value === 'failed')

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
      <UpdateNotice />
      <!-- The same bar in both workspaces (Milestone 17, decision 3). -->
      <span v-if="store.project && status" class="save-status" :class="{ problem }" role="status" data-testid="save-status">{{
        t(`save-${status}`)
      }}</span>
      <AppearancePanel v-if="store.project" />
      <MenuButton :label="t('app-menu')" :items="appItems" button-class="icon-button" align="end" testid="app-menu">
        <AppIcon name="menu" />
      </MenuButton>
    </div>
    <SettingsDialog ref="settingsDialog" />
    <AboutDialog ref="about" />
  </header>
</template>
