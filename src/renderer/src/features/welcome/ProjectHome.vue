<script setup lang="ts">
import { computed } from 'vue'
import type { EntryCountsDto } from '../../../../contract/dtos'
import { useWorkspaceStore } from '../../app/workspace-store'
import { describeFileProblem } from './describe-file-problem'

const workspace = useWorkspaceStore()

const COUNT_LABELS: ReadonlyArray<[keyof EntryCountsDto, string, string]> = [
  ['part', 'part', 'parts'],
  ['chapter', 'chapter', 'chapters'],
  ['character', 'character', 'characters'],
  ['location', 'location', 'locations'],
  ['note', 'note', 'notes'],
  ['scene', 'scene', 'scenes'],
  ['untyped', 'untyped file', 'untyped files']
]

const counts = computed(() => {
  const project = workspace.project
  if (project === null) return []
  return COUNT_LABELS.filter(([key]) => project.counts[key] > 0).map(([key, one, many]) => ({
    key,
    value: project.counts[key],
    label: project.counts[key] === 1 ? one : many
  }))
})
</script>

<template>
  <main v-if="workspace.project" class="project">
    <header>
      <div>
        <h1 dir="auto">{{ workspace.project.title }}</h1>
        <p v-if="workspace.project.author" class="author" dir="auto">
          {{ workspace.project.author }}
        </p>
        <p class="root" dir="auto">{{ workspace.project.root }}</p>
      </div>
      <button type="button" @click="workspace.backToWelcome()">Close project</button>
    </header>

    <p v-if="workspace.project.readOnly" class="banner" role="status">
      This project is open read-only. Plot Device won't change any of its files.
    </p>

    <ul v-if="workspace.project.warnings.length > 0" class="warnings">
      <li v-for="warning in workspace.project.warnings" :key="warning.code + warning.message">
        {{ warning.message }}
      </li>
    </ul>

    <section aria-labelledby="contents-heading">
      <h2 id="contents-heading">Contents</h2>
      <ul class="counts">
        <li v-for="count in counts" :key="count.key">
          <span class="value">{{ count.value }}</span> {{ count.label }}
        </li>
      </ul>
      <p v-if="counts.length === 0" class="empty">
        No markdown files yet. The binder and editor arrive in the next phase.
      </p>
    </section>

    <section v-if="workspace.project.problems.length > 0" aria-labelledby="problems-heading">
      <h2 id="problems-heading">Files that need attention</h2>
      <ul class="problems">
        <li v-for="problem in workspace.project.problems" :key="problem.path">
          <code dir="auto">{{ problem.path }}</code>
          <span>{{ describeFileProblem(problem) }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.project {
  max-width: 48rem;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

h1 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
  font-size: 2.25rem;
}

.author {
  margin: 0.25rem 0 0;
}

.root {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

h2 {
  margin: 2rem 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.banner,
.warnings {
  padding: 0.75rem 1rem;
  border-inline-start: 3px solid var(--warning);
  background: var(--surface);
}

.warnings {
  margin: 1rem 0 0;
  padding-inline-start: 2rem;
}

.counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.counts li {
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.value {
  font-size: 1.25rem;
  font-weight: 600;
}

.problems {
  margin: 0;
  padding: 0;
  list-style: none;
}

.problems li {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
}

.problems span {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.empty {
  color: var(--text-muted);
}
</style>
