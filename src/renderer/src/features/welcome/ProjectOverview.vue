<script setup lang="ts">
import { computed } from 'vue'
import type { EntryCountsDto } from '../../../../contract/dtos'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { describeFileProblem } from './describe-file-problem'

const workspace = useWorkspaceStore()
const manuscript = useManuscriptStore()

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

const warnings = computed(() => [
  ...(workspace.project?.warnings ?? []),
  ...(manuscript.manuscript?.warnings ?? [])
])
</script>

<template>
  <section v-if="workspace.project" class="overview" aria-labelledby="overview-title">
    <header>
      <div class="eyebrow">Project</div>
      <h1 id="overview-title" dir="auto">{{ workspace.project.title }}</h1>
      <p v-if="workspace.project.author" class="author" dir="auto">
        {{ workspace.project.author }}
      </p>
      <p class="root" dir="auto">{{ workspace.project.root }}</p>
    </header>

    <p class="hint">Choose a chapter in the binder to start writing.</p>

    <p v-if="workspace.project.readOnly" class="banner" role="status">
      This project is open read-only. Plot Device won’t change any of its files.
    </p>

    <section aria-labelledby="contents-heading">
      <h2 id="contents-heading" class="eyebrow">Contents</h2>
      <ul class="counts">
        <li v-for="count in counts" :key="count.key">
          <span class="value">{{ count.value }}</span> {{ count.label }}
        </li>
      </ul>
      <p v-if="counts.length === 0" class="muted">No markdown files yet.</p>
    </section>

    <section v-if="warnings.length > 0" aria-labelledby="warnings-heading">
      <h2 id="warnings-heading" class="eyebrow">Worth checking</h2>
      <ul class="list">
        <li v-for="warning in warnings" :key="warning.code + warning.message" dir="auto">
          {{ warning.message }}
        </li>
      </ul>
    </section>

    <section v-if="workspace.project.problems.length > 0" aria-labelledby="problems-heading">
      <h2 id="problems-heading" class="eyebrow">Files that need attention</h2>
      <ul class="list">
        <li v-for="problem in workspace.project.problems" :key="problem.path">
          <code dir="auto">{{ problem.path }}</code>
          <span class="muted">{{ describeFileProblem(problem) }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.overview {
  max-width: var(--measure);
  margin: 0 auto;
  padding-bottom: 80px;
  font-size: 14px;
}

h1 {
  margin: 6px 0 0;
  font-family: var(--font-prose);
  font-size: 36px;
  font-weight: 400;
  color: var(--text-strong);
}

.author {
  margin: 6px 0 0;
  color: var(--text-dim);
}

.root {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.hint {
  margin: 28px 0 0;
  font-family: var(--font-prose);
  font-size: 18px;
  font-style: italic;
  color: var(--text-dim);
}

h2 {
  margin: 36px 0 12px;
}

.banner {
  margin: 24px 0 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--raised);
  color: var(--text-dim);
}

.counts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.counts li {
  padding: 10px 14px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  color: var(--text-dim);
}

.value {
  font-size: 18px;
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
  gap: 3px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  line-height: 1.5;
}

.muted {
  color: var(--text-muted);
}
</style>
