<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '../../app/workspace-store'
import BookLanguageSelect from '../../shared/BookLanguageSelect.vue'
import LanguageSelector from '../../shared/LanguageSelector.vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'

const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const title = ref(workspace.chosenFolder?.name ?? '')
// A new book is most likely written in the language the writer reads the interface in.
const bookLanguage = ref<string | null>(language.locale)
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
      <form
        @submit.prevent="workspace.initializeChosenFolder(title, bookLanguage ?? language.locale)"
      >
        <label>
          {{ language.t('initialize-title-label') }}
          <input v-model="title" type="text" maxlength="500" dir="auto" autofocus />
        </label>
        <div>
          <BookLanguageSelect v-model="bookLanguage" described-by="book-language-help" />
          <p id="book-language-help" class="help">
            {{ language.t('initialize-book-language-help') }}
          </p>
        </div>
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
  padding: 14vh var(--space-6) var(--space-8);
}

h1 {
  margin: 0 0 var(--space-4);
  font-family: var(--font-prose);
  font-weight: 400;
  font-size: var(--text-heading);
}

p {
  line-height: 1.5;
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin-top: var(--space-6);
}

label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-body);
  color: var(--text-muted);
}

input {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: var(--text-title);
}

.actions {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.help {
  margin: var(--space-2) 0 0;
  font-size: var(--text-body);
  color: var(--text-muted);
}

.error {
  color: var(--danger);
}
</style>
