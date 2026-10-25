<script setup lang="ts">
import Wordmark from '../../shared/Wordmark.vue'
import { useWorkspaceStore } from '../../app/workspace-store'
import RecentProjectList from './RecentProjectList.vue'
import LanguageSelector from '../../shared/LanguageSelector.vue'
import { useUiLanguageStore } from '../../app/ui-language-store'

const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
</script>

<template>
  <main class="welcome">
    <header>
      <h1 class="title"><Wordmark /></h1>
      <p class="tagline">{{ language.t('welcome-tagline') }}</p>
    </header>

    <button
      class="primary"
      type="button"
      :disabled="workspace.busy"
      @click="workspace.chooseFolder()"
    >
      {{ language.t('open-folder') }}
    </button>

    <LanguageSelector />

    <p v-if="workspace.errorMessage" class="error" role="alert" dir="auto">
      {{ workspace.errorMessage }}
    </p>
    <p v-if="workspace.folderErrorMessage" class="error" role="alert" data-testid="folder-error">
      {{ workspace.folderErrorMessage }}
    </p>
    <p
      v-if="workspace.recentsLoadErrorMessage"
      class="error"
      role="alert"
      data-testid="recents-load-error"
    >
      {{ workspace.recentsLoadErrorMessage }}
    </p>
    <p
      v-if="workspace.recentsRemoveErrorMessage"
      class="error"
      role="alert"
      data-testid="recents-remove-error"
    >
      {{ workspace.recentsRemoveErrorMessage }}
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
  gap: var(--space-6);
  max-width: 36rem;
  margin: 0 auto;
  padding: 12vh var(--space-6) var(--space-8);
  text-align: center;
}

.title {
  margin: 0;
  font-size: 3rem; /* off-scale: the wordmark on the welcome screen is the one display moment */
  font-weight: 400;
}

.tagline {
  margin: var(--space-2) 0 0;
  color: var(--text-muted);
}

.error {
  margin: 0;
  color: var(--danger);
}
</style>
