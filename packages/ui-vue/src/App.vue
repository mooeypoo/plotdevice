<script setup lang="ts">
import type { AppInfo } from '@plotdevice/contracts'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useApi } from './api'
import ConfirmDialog from './components/ConfirmDialog.vue'
import PromptDialog from './components/PromptDialog.vue'
import SettingsMenu from './components/SettingsMenu.vue'
import StoryView from './components/StoryView.vue'
import WelcomeView from './components/WelcomeView.vue'
import WorkspaceSwitch from './components/WorkspaceSwitch.vue'
import WritingView from './components/WritingView.vue'
import { useAppearance } from './composables/use-appearance'
import { useRememberedPlace } from './composables/use-remembered-place'
import { useProjectStore } from './stores/project'
import { useSettingsStore } from './stores/settings'
import { useViewStore } from './stores/view'

const api = useApi()
const settings = useSettingsStore()
const { preferences } = storeToRefs(settings)
useAppearance(preferences)
const store = useProjectStore()
const view = useViewStore()
useRememberedPlace()

const appInfo = ref<AppInfo | null>(null)
void api.getAppInfo().then((info) => (appInfo.value = info))
</script>

<template>
  <div v-if="settings.preferences" class="shell" :class="{ 'focus-mode': view.focusMode }">
    <header v-if="!view.focusMode" class="shell-header">
      <span class="app-name">{{ settings.t('app-name') }}</span>
      <span v-if="store.project" class="project-title" dir="auto">{{ store.project.title }}</span>
      <WorkspaceSwitch v-if="store.project" />
      <SettingsMenu />
    </header>

    <template v-if="store.project">
      <!-- Write stays mounted while Story is shown, so the editor, cursor and undo history survive the switch. -->
      <WritingView v-show="view.workspace === 'write'" :key="store.project.root" :project="store.project" />
      <StoryView v-if="view.workspace === 'story'" :project="store.project" />
    </template>
    <WelcomeView v-else />

    <footer v-if="appInfo && !store.project" class="secondary app-footer">{{ settings.t('app-version', appInfo.version) }}</footer>
    <PromptDialog />
    <ConfirmDialog />
  </div>
</template>
