<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '../../app/workspace-store'
import LanguageSelector from '../../shared/LanguageSelector.vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'

const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const title = ref(workspace.chosenFolder?.name ?? '')
</script>

<template>
  <main v-if="workspace.chosenFolder" class="prompt">
    <LanguageSelector />
    <template v-if="workspace.chosenFolder.projectAbove">
      <h1>{{ language.t('initialize-inside-heading') }}</h1>
      <p>
        {{
          language.t(
            'initialize-inside-description',
            isolate(workspace.chosenFolder.name),
            isolate(workspace.chosenFolder.projectAbove.title)
          )
        }}
      </p>
      <div class="actions">
        <button
          class="primary"
          type="button"
          :disabled="workspace.busy"
          @click="workspace.openProject(workspace.chosenFolder.projectAbove.root)"
        >
          {{
            language.t('initialize-open-parent', isolate(workspace.chosenFolder.projectAbove.title))
          }}
        </button>
        <button type="button" @click="workspace.backToWelcome()">
          {{ language.t('initialize-back') }}
        </button>
      </div>
    </template>

    <template v-else-if="workspace.chosenFolder.projectBelow">
      <h1>{{ language.t('initialize-contains-heading') }}</h1>
      <p>
        {{
          language.t(
            'initialize-contains-description',
            isolate(workspace.chosenFolder.projectBelow)
          )
        }}
      </p>
      <div class="actions">
        <button type="button" @click="workspace.backToWelcome()">
          {{ language.t('initialize-back') }}
        </button>
      </div>
    </template>

    <template v-else>
      <h1>{{ language.t('initialize-heading', isolate(workspace.chosenFolder.name)) }}</h1>
      <p>
        {{ language.t('initialize-description', isolate('novel.md')) }}
      </p>
      <form @submit.prevent="workspace.initializeChosenFolder(title)">
        <label>
          {{ language.t('initialize-title-label') }}
          <input v-model="title" type="text" maxlength="500" dir="auto" autofocus />
        </label>
        <div class="actions">
          <button class="primary" type="submit" :disabled="workspace.busy">
            {{ language.t('initialize-create') }}
          </button>
          <button type="button" @click="workspace.backToWelcome()">
            {{ language.t('initialize-back') }}
          </button>
        </div>
      </form>
    </template>

    <p v-if="workspace.errorMessage" class="error" role="alert" dir="auto">
      {{ workspace.errorMessage }}
    </p>
    <p v-if="workspace.folderErrorMessage" class="error" role="alert" data-testid="folder-error">
      {{ workspace.folderErrorMessage }}
    </p>
  </main>
</template>

<style scoped>
.prompt {
  max-width: 34rem;
  margin: 0 auto;
  padding: 14vh 1.5rem 3rem;
}

h1 {
  margin: 0 0 0.75rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
  font-size: 1.75rem;
}

p {
  line-height: 1.5;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

input {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 1rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.error {
  color: var(--danger);
}
</style>
