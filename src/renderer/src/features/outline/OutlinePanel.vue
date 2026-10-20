<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { createOutlineView, type OutlineView } from './outline-view'
import { useOutlinePanel } from './use-outline-panel'

const manuscript = useManuscriptStore()
const workspace = useWorkspaceStore()
const panel = useOutlinePanel()
const { outlines, path, text, openInEditor, loading, error, linkNotice } = panel

const host = ref<HTMLElement | null>(null)
let view: OutlineView | undefined

function mount(): void {
  if (host.value === null || view !== undefined || text.value === null) return
  view = createOutlineView(host.value, {
    text: text.value,
    linkTargets: manuscript.manuscript?.linkTargets ?? [],
    onOpenLink: (link) => void panel.openLink(link)
  })
  view.highlight(panel.pointsHere.value)
}

watch(host, () => {
  view?.destroy()
  view = undefined
  mount()
})
watch(text, (next) => {
  if (next === null) return
  if (view === undefined) mount()
  else view.setText(next)
})
watch(panel.pointsHere, (pointsHere) => view?.highlight(pointsHere))
watch(
  () => manuscript.manuscript?.linkTargets,
  (targets) => view?.setLinkTargets(targets ?? [])
)

onBeforeUnmount(() => {
  view?.destroy()
})

function choose(event: Event): void {
  panel.choose((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <section class="outline" aria-label="Outline">
    <header>
      <select
        v-if="outlines.length > 1"
        class="choose"
        dir="auto"
        :value="path ?? ''"
        aria-label="Outline to show"
        @change="choose"
      >
        <option
          v-for="outline in outlines"
          :key="outline.path"
          :value="outline.path"
          :title="outline.path"
        >
          {{ outline.title }}
        </option>
      </select>
      <span v-else-if="outlines.length === 1" class="title" dir="auto">{{
        outlines[0]?.title
      }}</span>
      <button
        v-if="path !== null && !openInEditor"
        type="button"
        class="quiet small"
        @click="panel.edit()"
      >
        Edit
      </button>
    </header>
    <span v-if="path" class="file-path" dir="auto" :title="path">{{ path }}</span>
    <p v-if="linkNotice" class="empty" role="status">{{ linkNotice }}</p>

    <div v-if="outlines.length === 0" class="empty">
      <p>
        An outline is your plan: how you see the story going, chapters you haven’t written yet,
        questions to settle. Write it freely; link chapters with [[their names]].
      </p>
      <button
        v-if="!(workspace.project?.readOnly ?? false)"
        type="button"
        class="primary"
        @click="panel.create()"
      >
        Start an outline
      </button>
    </div>
    <p v-else-if="openInEditor" class="empty">
      This outline is open in the editor. It shows here again when you open a chapter.
    </p>
    <p v-else-if="loading" class="empty" role="status">Loading outline…</p>
    <p v-else-if="error" class="empty error" role="alert">{{ error }}</p>
    <div v-else-if="text !== null" ref="host" class="view" dir="auto"></div>
  </section>
</template>

<style scoped>
.outline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.title {
  font-weight: 600;
  color: var(--text-strong);
}

.choose {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
}

.small {
  padding: 4px 10px;
  font-size: 12px;
}

.view {
  font-size: 15px;
  font-family: var(--font-prose);
  line-height: 1.72;
  color: var(--prose);
  overflow-wrap: anywhere;
}

.view :deep(:first-child) {
  margin-top: 0;
}

.view :deep(h1),
.view :deep(h2),
.view :deep(h3),
.view :deep(h4),
.view :deep(h5),
.view :deep(h6) {
  margin-block: 1.5em 0.5em;
  line-height: 1.3;
  color: var(--text-strong);
}

.view :deep(h1) {
  font-size: 1.6em;
}

.view :deep(h2) {
  font-size: 1.3em;
}

.view :deep(h3),
.view :deep(h4),
.view :deep(h5),
.view :deep(h6) {
  font-size: 1.1em;
}

.view :deep(ul),
.view :deep(ol) {
  padding-inline-start: 1.5em;
}

.view :deep(blockquote) {
  margin-inline: 0;
  padding-inline-start: 1em;
  border-inline-start: 2px solid var(--line-strong);
  color: var(--text-dim);
}

.view :deep(pre) {
  overflow-x: auto;
  padding: 10px;
  background: var(--bg-sunken);
}

.view :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.view :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}

.view :deep(th),
.view :deep(td) {
  padding: 4px 8px;
  border: 1px solid var(--line-strong);
}

.view :deep(.outline-current) {
  background: var(--accent-soft);
  border-radius: 4px;
}

.view :deep(.outline-link) {
  color: var(--link-other);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

.view :deep(.outline-link-character) {
  color: var(--link-character);
}

.view :deep(.outline-link-location) {
  color: var(--link-location);
}

.view :deep(.outline-link-note),
.view :deep(.outline-link-outline) {
  color: var(--link-note);
}

.view :deep(.outline-link-missing) {
  color: var(--link-missing);
}

.view :deep(.outline-link-ambiguous) {
  color: var(--warning);
}

.file-path {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error {
  color: var(--danger);
}

.empty {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.empty p {
  margin: 0 0 12px;
}
</style>
