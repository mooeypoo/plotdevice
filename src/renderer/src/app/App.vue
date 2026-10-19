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

onMounted(() => {
  void workspace.loadRecents()
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
  stopListening?.()
})
</script>

<template>
  <WelcomeScreen v-if="workspace.screen === 'welcome'" />
  <InitializePrompt v-else-if="workspace.screen === 'initialize'" />
  <ProjectLayout v-else />
</template>
