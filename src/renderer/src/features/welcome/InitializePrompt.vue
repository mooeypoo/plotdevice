<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '../../app/workspace-store'

const workspace = useWorkspaceStore()
const title = ref(workspace.chosenFolder?.name ?? '')
</script>

<template>
  <main v-if="workspace.chosenFolder" class="prompt">
    <template v-if="workspace.chosenFolder.projectAbove">
      <h1>This folder is part of another project</h1>
      <p dir="auto">
        <strong>{{ workspace.chosenFolder.name }}</strong> is inside
        <strong>{{ workspace.chosenFolder.projectAbove.title }}</strong
        >. Projects can't be nested.
      </p>
      <div class="actions">
        <button
          class="primary"
          type="button"
          :disabled="workspace.busy"
          @click="workspace.openProject(workspace.chosenFolder.projectAbove.root)"
        >
          Open {{ workspace.chosenFolder.projectAbove.title }}
        </button>
        <button type="button" @click="workspace.backToWelcome()">Back</button>
      </div>
    </template>

    <template v-else-if="workspace.chosenFolder.projectBelow">
      <h1>This folder contains another project</h1>
      <p dir="auto">
        <strong>{{ workspace.chosenFolder.projectBelow }}</strong> is already a project. Projects
        sit side by side; they can't be nested. Choose a different folder.
      </p>
      <div class="actions">
        <button type="button" @click="workspace.backToWelcome()">Back</button>
      </div>
    </template>

    <template v-else>
      <h1 dir="auto">Make “{{ workspace.chosenFolder.name }}” a project?</h1>
      <p>
        Plot Device will add one file, <code>novel.md</code>, with your project's settings. Nothing
        else in the folder changes.
      </p>
      <form @submit.prevent="workspace.initializeChosenFolder(title)">
        <label>
          Title
          <input v-model="title" type="text" maxlength="500" dir="auto" autofocus />
        </label>
        <div class="actions">
          <button class="primary" type="submit" :disabled="workspace.busy">Create project</button>
          <button type="button" @click="workspace.backToWelcome()">Back</button>
        </div>
      </form>
    </template>

    <p v-if="workspace.errorMessage" class="error" role="alert" dir="auto">
      {{ workspace.errorMessage }}
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
