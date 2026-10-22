<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import InitializePrompt from '../features/welcome/InitializePrompt.vue'
import WelcomeScreen from '../features/welcome/WelcomeScreen.vue'
import { useEditorStore } from './editor-store'
import { plotDeviceApi } from './plot-device-api'
import ProjectLayout from './ProjectLayout.vue'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()
const editor = useEditorStore()
const language = useUiLanguageStore()
let stopListening: (() => void) | undefined
let stopOpenFolder: (() => void) | undefined

onMounted(() => {
  void workspace.loadRecents()
  // `plotdevice <folder>` or "Open With": now, and whenever the app is started again with one.
  void workspace.openLaunchFolder()
  stopOpenFolder = plotDeviceApi.current().workspace.onOpenFolder((result) => {
    void workspace.useFolderResult(result)
  })
  // Save the last keystrokes before the window closes.
  stopListening = plotDeviceApi.current().app.onBeforeClose(() => {
    if (editor.recoveryBusy || editor.navigationBusy) {
      plotDeviceApi.current().app.cancelClose()
      return
    }
    void editor.flush().finally(() => {
      const app = plotDeviceApi.current().app
      if (editor.recoveryBusy || editor.navigationBusy) {
        app.cancelClose()
        return
      }
      const discard =
        !editor.hasStuckChanges ||
        window.confirm(language.t('app-close-confirm-unresolved-draft'))
      if (discard) app.readyToClose()
      else app.cancelClose()
    })
  })
})

onBeforeUnmount(() => {
  stopOpenFolder?.()
  stopListening?.()
})
</script>

<template>
  <WelcomeScreen v-if="workspace.screen === 'welcome'" />
  <InitializePrompt v-else-if="workspace.screen === 'initialize'" />
  <ProjectLayout v-else :key="workspace.project?.root" />
</template>
