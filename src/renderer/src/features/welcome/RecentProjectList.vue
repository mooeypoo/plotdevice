<script setup lang="ts">
import type { RecentProjectDto } from '../../../../contract/dtos'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'
import { useRecentProjectDates } from './use-recent-project-dates'

defineProps<{
  recents: readonly RecentProjectDto[]
  disabled: boolean
}>()

defineEmits<{
  open: [root: string]
  remove: [root: string]
}>()

const language = useUiLanguageStore()
const { formatDate } = useRecentProjectDates()
</script>

<template>
  <section v-if="recents.length > 0" class="recents" aria-labelledby="recents-heading">
    <h2 id="recents-heading">{{ language.t('recents-heading') }}</h2>
    <ul>
      <li v-for="project in recents" :key="project.root" :class="{ missing: !project.available }">
        <button
          class="open"
          type="button"
          :disabled="disabled || !project.available"
          @click="$emit('open', project.root)"
        >
          <span class="title" dir="auto">{{ project.title }}</span>
          <span class="details" :dir="project.available ? 'auto' : undefined">
            {{ project.available ? project.root : language.t('recents-folder-missing') }}
          </span>
        </button>
        <span class="date">{{ formatDate(project.lastOpenedAt) }}</span>
        <button
          class="remove"
          type="button"
          :aria-label="language.t('recents-remove-label', isolate(project.title))"
          :title="language.t('recents-remove-tooltip')"
          @click="$emit('remove', project.root)"
        >
          ×
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.recents {
  width: 100%;
  text-align: start;
}

h2 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--border);
}

li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.open {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  padding: 0.6rem 0.25rem;
  border: none;
  background: none;
  text-align: start;
}

.open:not(:disabled):hover .title {
  color: var(--accent);
}

.title {
  font-weight: 600;
}

.details {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.missing .title {
  color: var(--text-muted);
}

.date {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.remove {
  padding: 0.25rem 0.5rem;
  border: none;
  background: none;
  font-size: 1.1rem;
  color: var(--text-muted);
}

.remove:hover {
  color: var(--danger);
}
</style>
