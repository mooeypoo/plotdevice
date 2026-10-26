<script setup lang="ts">
import type { AppInfo } from '@plotdevice/contracts'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useApi } from './api'
import ConfirmDialog from './components/ConfirmDialog.vue'
import LinkPicker from './components/LinkPicker.vue'
import VersionsDialog from './components/VersionsDialog.vue'
import PromptDialog from './components/PromptDialog.vue'
import StoryView from './components/StoryView.vue'
import TopBar from './components/TopBar.vue'
import WelcomeView from './components/WelcomeView.vue'
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
    <TopBar v-if="!view.focusMode" />

    <template v-if="store.project">
      <!-- Write stays mounted while Story is shown, so the editor, cursor and undo history survive the switch. -->
      <WritingView v-show="view.workspace === 'write'" :key="store.project.root" :project="store.project" />
      <StoryView v-if="view.workspace === 'story'" :project="store.project" />
    </template>
    <WelcomeView v-else />

    <p v-if="appInfo && !store.project" class="secondary app-version">{{ settings.t('app-version', appInfo.version) }}</p>
    <p v-if="store.project && store.notice" class="notice-toast" role="alert">
      <span>{{ settings.t(store.notice.key, ...store.notice.params) }}</span>
      <button type="button" class="icon-button" :aria-label="settings.t('prompt-cancel')" @click="store.notice = null">×</button>
    </p>
    <PromptDialog />
    <ConfirmDialog />
    <LinkPicker />
    <VersionsDialog />
  </div>
</template>
