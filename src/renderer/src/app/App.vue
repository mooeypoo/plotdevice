<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import InitializePrompt from '../features/welcome/InitializePrompt.vue'
import WelcomeScreen from '../features/welcome/WelcomeScreen.vue'
import { useEditorStore } from './editor-store'
import { plotDeviceApi } from './plot-device-api'
import ProjectLayout from './ProjectLayout.vue'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()
const editor = useEditorStore()
let stopListening: (() => void) | undefined
let stopOpenFolder: (() => void) | undefined

onMounted(() => {
  void workspace.loadRecents()
  // `plotdevice <folder>` or "Open With": now, and whenever the app is started again with one.
  void workspace.openLaunchFolder()
  stopOpenFolder = plotDeviceApi.current().workspace.onOpenFolder((choice) => {
    void workspace.useFolder(choice)
  })
  // Save the last keystrokes before the window closes.
  stopListening = plotDeviceApi.current().app.onBeforeClose(() => {
    void editor.flush().finally(() => {
      const app = plotDeviceApi.current().app
      const discard =
        !editor.hasStuckChanges ||
        window.confirm(
          'Your latest changes to this chapter couldn’t be saved. Close anyway and lose them?'
        )
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
  <ProjectLayout v-else />
</template>
