<script setup lang="ts">
import type { TemplateId } from '@plotdevice/contracts'
import { nextTick, ref } from 'vue'
import { useApi } from '../api'
import { bringInGuideFor } from '../links'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useViewStore } from '../stores/view'
import BrandMark from './BrandMark.vue'

const api = useApi()
const store = useProjectStore()
const settings = useSettingsStore()
const view = useViewStore()
// "New project…" from the app menu opens straight on the picker, over the open book (Milestone 19).
const creating = ref(view.newProject)
const template = ref<TemplateId>('novel')
const title = ref('')
const author = ref('')
const language = ref(settings.locale)
const location = ref('')
const picker = ref<HTMLElement | null>(null)

const bookLanguages = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
]
// Blank is always offered, so no template is ever forced (PRD §5).
const templates: TemplateId[] = ['novel', 'short-story', 'campaign', 'blank']

async function start(): Promise<void> {
  creating.value = true
  // The interface's language may have changed since this screen first showed.
  language.value = settings.locale
  location.value = await api.newProjectLocation()
  await nextTick()
  picker.value?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus()
}

function back(): void {
  creating.value = false
  view.newProject = false
}

async function choose(): Promise<void> {
  const chosen = await api.chooseNewProjectLocation()
  if (chosen) location.value = chosen
}

async function create(): Promise<void> {
  if (title.value.trim() === '' || location.value === '') return
  const created = await store.create({
    title: title.value.trim(),
    language: language.value,
    template: template.value,
    location: location.value,
    ...(author.value.trim() ? { author: author.value.trim() } : {}),
  })
  if (created) back()
}

if (creating.value) void start()
</script>

<template>
  <main class="welcome-view" :class="{ picking: creating }">
    <template v-if="!creating">
      <BrandMark class="welcome-mark" draw />
      <h1 class="app-title">{{ settings.t('app-name') }}</h1>
      <p class="welcome">{{ settings.t('shell-welcome') }}</p>
    </template>

    <form v-if="creating" ref="picker" class="new-project" data-testid="new-project-form" @submit.prevent="create">
      <button type="button" class="link-button new-project-back" data-testid="new-project-back" @click="back">
        {{ settings.t('new-project-back') }}
      </button>
      <h1 class="new-project-question">{{ settings.t('new-project-question') }}</h1>
      <p class="secondary new-project-later">{{ settings.t('new-project-adjust-later') }}</p>

      <fieldset class="templates">
        <legend class="visually-hidden">{{ settings.t('new-project-templates') }}</legend>
        <label v-for="id in templates" :key="id" class="template-card" :class="{ chosen: template === id }" :data-testid="`template-${id}`">
          <input v-model="template" type="radio" name="template" :value="id" class="visually-hidden" />
          <span class="template-name">{{ settings.t(`template-${id}`) }}</span>
          <span class="template-peek" aria-hidden="true">
            <span>{{ settings.t(`template-${id}-kinds`) }}</span>
            <span v-if="id !== 'blank'">{{ settings.t(`template-${id}-outlines`) }}</span>
          </span>
          <span class="template-description">{{ settings.t(`template-${id}-description`) }}</span>
          <span class="secondary template-summary">{{ settings.t(`template-${id}-summary`) }}</span>
        </label>
      </fieldset>

      <div class="new-project-details">
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
        <div class="field">
          <span id="new-project-location" class="location-label">{{ settings.t('new-project-location-label') }}</span>
          <span class="location-row">
            <output class="location" dir="ltr" aria-labelledby="new-project-location" data-testid="new-project-location">{{
              location
            }}</output>
            <button type="button" data-testid="new-project-choose" @click="choose">{{ settings.t('new-project-choose') }}</button>
          </span>
        </div>
      </div>
      <p class="secondary">{{ settings.t('new-project-hint') }}</p>
      <div class="actions">
        <!-- Only over an open book: from the start screen there is nothing to go back to but "← Back". -->
        <button v-if="store.project" type="button" data-testid="new-project-cancel" @click="back">
          {{ settings.t('prompt-cancel') }}
        </button>
        <button type="submit" class="primary" data-testid="new-project-create" :disabled="location === ''">
          {{ settings.t('new-project-create') }}
        </button>
      </div>
    </form>

    <div v-else class="actions start">
      <button type="button" class="primary" data-testid="new-project" @click="start">
        {{ settings.t('welcome-new-project') }}
      </button>
      <button type="button" data-testid="open-project" @click="store.open('choose')">{{ settings.t('welcome-open-project') }}</button>
    </div>
    <p v-if="!creating" class="welcome-sample">
      <button type="button" class="link-button" data-testid="try-sample" @click="store.openSample(settings.locale)">
        {{ settings.t('welcome-try-sample') }}
      </button>
    </p>
    <p v-if="!creating" class="welcome-bring-in secondary">
      {{ settings.t('welcome-bring-in-question') }}
      <a :href="bringInGuideFor(settings.locale)" target="_blank" rel="noreferrer" data-testid="welcome-bring-in">{{
        settings.t('welcome-bring-in')
      }}</a>
    </p>

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
            <span class="recent-title" dir="auto"
              >{{ project.title }} <span v-if="project.sample" class="sample-badge">{{ settings.t('sample-badge') }}</span></span
            >
            <span v-if="!project.sample" class="secondary recent-folder" dir="ltr">{{ project.root }}</span>
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
