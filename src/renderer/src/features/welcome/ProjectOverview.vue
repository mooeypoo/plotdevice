<script setup lang="ts">
import { computed } from 'vue'
import type { EntryCountsDto } from '../../../../contract/dtos'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import WarningsPanel from '../warnings/WarningsPanel.vue'
import { useWarnings } from '../warnings/use-warnings'

const workspace = useWorkspaceStore()
const editor = useEditorStore()
const manuscript = useManuscriptStore()
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

const counts = computed(() => {
  const project = workspace.project
  if (project === null) return []
  return COUNT_LABELS.filter(([key]) => project.counts[key] > 0).map(([key, message]) => {
    const count = project.counts[key]
    return { key, value: chrome.formatNumber(count), label: language.t(message, count) }
  })
})

const { groups: warningGroups } = useWarnings()
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

    <WarningsPanel
      v-if="warningGroups.length > 0"
      :groups="warningGroups"
      :can-open="editor.canOpen"
      :read-only="workspace.project.readOnly"
      @fix="(path, fix) => manuscript.fixWarning(path, fix)"
      @open="editor.open($event)"
    />
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
