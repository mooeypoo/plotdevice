<script setup lang="ts">
import Wordmark from '../../shared/Wordmark.vue'
import { useWorkspaceStore } from '../../app/workspace-store'
import RecentProjectList from './RecentProjectList.vue'

const workspace = useWorkspaceStore()
</script>

<template>
  <main class="welcome">
    <header>
      <h1 class="title"><Wordmark /></h1>
      <p class="tagline">Your novel, as plain markdown files.</p>
    </header>

    <button
      class="primary"
      type="button"
      :disabled="workspace.busy"
      @click="workspace.chooseFolder()"
    >
      Open folder…
    </button>

    <p v-if="workspace.errorMessage" class="error" role="alert" dir="auto">
      {{ workspace.errorMessage }}
    </p>

    <RecentProjectList
      :recents="workspace.recents"
      :disabled="workspace.busy"
      @open="workspace.openProject"
      @remove="workspace.removeRecent"
    />
  </main>
</template>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 36rem;
  margin: 0 auto;
  padding: 12vh 1.5rem 3rem;
  text-align: center;
}

.title {
  margin: 0;
  font-size: 3rem;
  font-weight: 400;
}

.tagline {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
}

.error {
  margin: 0;
  color: var(--danger);
}
</style>
