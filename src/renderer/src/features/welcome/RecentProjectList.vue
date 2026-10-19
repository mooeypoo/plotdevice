<script setup lang="ts">
import type { RecentProjectDto } from '../../../../contract/dtos'

defineProps<{
  recents: readonly RecentProjectDto[]
  disabled: boolean
}>()

defineEmits<{
  open: [root: string]
  remove: [root: string]
}>()

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date)
}
</script>

<template>
  <section v-if="recents.length > 0" class="recents" aria-labelledby="recents-heading">
    <h2 id="recents-heading">Recent projects</h2>
    <ul>
      <li v-for="project in recents" :key="project.root" :class="{ missing: !project.available }">
        <button
          class="open"
          type="button"
          :disabled="disabled || !project.available"
          @click="$emit('open', project.root)"
        >
          <span class="title" dir="auto">{{ project.title }}</span>
          <span class="details" dir="auto">
            {{ project.available ? project.root : 'Folder not found' }}
          </span>
        </button>
        <span class="date">{{ formatDate(project.lastOpenedAt) }}</span>
        <button
          class="remove"
          type="button"
          :aria-label="`Remove ${project.title} from recent projects`"
          title="Remove from list (the folder is not touched)"
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
