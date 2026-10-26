<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import BrandMark from './BrandMark.vue'

const store = useProjectStore()
const settings = useSettingsStore()
const creating = ref(false)
const title = ref('')
const author = ref('')
const language = ref(settings.locale)

const bookLanguages = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
]

async function create(): Promise<void> {
  if (title.value.trim() === '') return
  const created = await store.create({
    title: title.value.trim(),
    language: language.value,
    ...(author.value.trim() ? { author: author.value.trim() } : {}),
  })
  if (created) creating.value = false
}
</script>

<template>
  <main class="welcome-view">
    <BrandMark class="welcome-mark" draw />
    <h1 class="app-title">{{ settings.t('app-name') }}</h1>
    <p class="welcome">{{ settings.t('shell-welcome') }}</p>

    <form v-if="creating" class="new-project" data-testid="new-project-form" @submit.prevent="create">
      <label class="field">
        <span>{{ settings.t('new-project-title-label') }}</span>
        <input v-model="title" type="text" dir="auto" required data-testid="new-project-title" />
      </label>
      <label class="field">
        <span>{{ settings.t('new-project-author-label') }}</span>
        <input v-model="author" type="text" dir="auto" />
      </label>
      <label class="field">
        <span>{{ settings.t('new-project-language-label') }}</span>
        <select v-model="language" data-testid="new-project-language">
          <option v-for="option in bookLanguages" :key="option.value" :value="option.value" :lang="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <p class="secondary">{{ settings.t('new-project-hint') }}</p>
      <div class="actions">
        <button type="button" @click="creating = false">{{ settings.t('prompt-cancel') }}</button>
        <button type="submit" class="primary" data-testid="new-project-create">{{ settings.t('new-project-create') }}</button>
      </div>
    </form>

    <div v-else class="actions start">
      <button type="button" class="primary" data-testid="new-project" @click="creating = true">
        {{ settings.t('welcome-new-project') }}
      </button>
      <button type="button" data-testid="open-project" @click="store.open('choose')">{{ settings.t('welcome-open-project') }}</button>
    </div>

    <p v-if="store.notice" class="warning" role="alert">{{ settings.t(store.notice.key, ...store.notice.params) }}</p>

    <section v-if="store.recent.length > 0 && !creating" class="recent" :aria-label="settings.t('welcome-recent')">
      <h2>{{ settings.t('welcome-recent') }}</h2>
      <ul>
        <li v-for="project in store.recent" :key="project.root" :class="{ unavailable: !project.available }">
          <button
            v-if="project.available"
            type="button"
            class="recent-project"
            data-testid="recent-project"
            @click="store.open({ recent: project.root })"
          >
            <span class="recent-title" dir="auto">{{ project.title }}</span>
            <span class="secondary recent-folder" dir="ltr">{{ project.root }}</span>
          </button>
          <div v-else class="recent-project">
            <span class="recent-title" dir="auto">{{ project.title }}</span>
            <span class="secondary">{{ settings.t('welcome-recent-missing') }}</span>
            <span class="actions">
              <button type="button" @click="store.open('choose')">{{ settings.t('welcome-find') }}</button>
              <button type="button" @click="store.forget(project.root)">{{ settings.t('welcome-forget') }}</button>
            </span>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>
