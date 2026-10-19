<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import InitializePrompt from '../features/welcome/InitializePrompt.vue'
import WelcomeScreen from '../features/welcome/WelcomeScreen.vue'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import ProjectLayout from './ProjectLayout.vue'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()
let stopListening: (() => void) | undefined

onMounted(() => {
  void workspace.loadRecents()
  // Save the last keystrokes before the window closes.
  stopListening = plotDeviceApi.current().app.onBeforeClose(() => {
    void manuscript.flush().finally(() => {
      const app = plotDeviceApi.current().app
      const discard =
        !manuscript.hasStuckChanges ||
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
