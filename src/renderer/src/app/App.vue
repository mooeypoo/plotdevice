<script setup lang="ts">
import { onMounted } from 'vue'
import InitializePrompt from '../features/welcome/InitializePrompt.vue'
import ProjectHome from '../features/welcome/ProjectHome.vue'
import WelcomeScreen from '../features/welcome/WelcomeScreen.vue'
import { useWorkspaceStore } from './workspace-store'

const workspace = useWorkspaceStore()

onMounted(() => {
  void workspace.loadRecents()
})
</script>

<template>
  <WelcomeScreen v-if="workspace.screen === 'welcome'" />
  <InitializePrompt v-else-if="workspace.screen === 'initialize'" />
  <ProjectHome v-else />
</template>
