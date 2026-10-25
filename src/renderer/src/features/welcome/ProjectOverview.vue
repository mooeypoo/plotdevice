<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EntryCountsDto } from '../../../../contract/dtos'
import { useWorkspaceStore } from '../../app/workspace-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import BookLanguageSelect from '../../shared/BookLanguageSelect.vue'
import { useChromePresentation } from '../../shared/use-chrome-presentation'

const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()

type CountMessageKey =
  | 'project-overview-count-part'
  | 'project-overview-count-chapter'
  | 'project-overview-count-character'
  | 'project-overview-count-location'
  | 'project-overview-count-note'
  | 'project-overview-count-outline'
  | 'project-overview-count-scene'
  | 'project-overview-count-untyped'

const COUNT_LABELS = [
  ['part', 'project-overview-count-part'],
  ['chapter', 'project-overview-count-chapter'],
  ['character', 'project-overview-count-character'],
  ['location', 'project-overview-count-location'],
  ['note', 'project-overview-count-note'],
  ['outline', 'project-overview-count-outline'],
  ['scene', 'project-overview-count-scene'],
  ['untyped', 'project-overview-count-untyped']
] as const satisfies readonly (readonly [keyof EntryCountsDto, CountMessageKey])[]

const declaredLanguage = computed(() => workspace.project?.language.declared ?? null)
const chosenLanguage = ref<string | null>(declaredLanguage.value)
watch(declaredLanguage, (declared) => {
  chosenLanguage.value = declared
})
const languageChanged = computed(
  () => chosenLanguage.value !== null && chosenLanguage.value !== declaredLanguage.value
)

async function applyBookLanguage(): Promise<void> {
  if (chosenLanguage.value !== null) await workspace.setBookLanguage(chosenLanguage.value)
}

const counts = computed(() => {
  const project = workspace.project
  if (project === null) return []
  return COUNT_LABELS.filter(([key]) => project.counts[key] > 0).map(([key, message]) => {
    const count = project.counts[key]
    return { key, value: chrome.formatNumber(count), label: language.t(message, count) }
  })
})
</script>

<template>
  <section v-if="workspace.project" class="overview" aria-labelledby="overview-title">
    <header>
      <div class="eyebrow">{{ language.t('project-overview-label') }}</div>
      <h1 id="overview-title" dir="auto">{{ workspace.project.title }}</h1>
      <p v-if="workspace.project.author" class="author" dir="auto">
        {{ workspace.project.author }}
      </p>
      <p class="root" dir="auto">{{ workspace.project.root }}</p>
    </header>

    <p class="hint">{{ language.t('project-overview-hint') }}</p>

    <p v-if="workspace.project.readOnly" class="banner" role="status">
      {{ language.t('editor-read-only-notice') }}
    </p>

    <section aria-labelledby="contents-heading">
      <h2 id="contents-heading" class="eyebrow">{{ language.t('project-overview-contents') }}</h2>
      <ul class="counts">
        <li v-for="count in counts" :key="count.key">
          <span class="value">{{ count.value }}</span> {{ count.label }}
        </li>
      </ul>
      <p v-if="counts.length === 0" class="muted">
        {{ language.t('project-overview-empty') }}
      </p>
    </section>

    <section class="book-language">
      <form @submit.prevent="applyBookLanguage">
        <BookLanguageSelect
          v-model="chosenLanguage"
          :disabled="workspace.project.readOnly"
          described-by="book-language-help"
        />
        <button v-if="languageChanged" type="submit">
          {{ language.t('project-overview-book-language-apply') }}
        </button>
      </form>
      <p id="book-language-help" class="muted">
        {{ language.t('project-overview-book-language-help') }}
      </p>
      <p v-if="workspace.bookLanguageErrorMessage" class="error" role="alert" dir="auto">
        {{ workspace.bookLanguageErrorMessage }}
      </p>
    </section>

    <!-- The shell places the project's warnings here. -->
    <slot name="warnings" />
  </section>
</template>

<style scoped>
.overview {
  max-width: var(--measure);
  margin: 0 auto;
  padding-bottom: calc(var(--space-8) + var(--space-7));
  font-size: var(--text-title);
}

h1 {
  margin: var(--space-3) 0 0;
  font-family: var(--font-prose);
  font-size: var(--text-display);
  font-weight: 400;
  color: var(--text-strong);
}

.author {
  margin: var(--space-3) 0 0;
  color: var(--text-dim);
}

.root {
  margin: var(--space-3) 0 0;
  font-size: var(--text-small);
  color: var(--text-muted);
}

.hint {
  margin: var(--space-6) 0 0;
  font-family: var(--font-prose);
  font-size: var(--text-title);
  font-style: italic;
  color: var(--text-dim);
}

h2 {
  margin: var(--space-7) 0 var(--space-4);
}

.banner {
  margin: var(--space-6) 0 0;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-card);
  background: var(--raised);
  color: var(--text-dim);
}

.counts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.counts li {
  padding: var(--space-3) var(--space-5);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-card);
  color: var(--text-dim);
}

.value {
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--text-strong);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--line);
  line-height: 1.5;
}

.book-language {
  margin-top: var(--space-7);
}

.book-language form {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
}

.error {
  color: var(--danger);
}

.muted {
  color: var(--text-muted);
}
</style>
