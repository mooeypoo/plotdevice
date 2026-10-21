<script setup lang="ts">
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import { useOutlinePanel } from './use-outline-panel'

const manuscript = useManuscriptStore()
const workspace = useWorkspaceStore()
const panel = useOutlinePanel()
const { outlines, path, text, openInEditor, loading, error, linkNotice } = panel

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
    <RenderedMarkdown
      v-else-if="text !== null"
      :text="text"
      :link-targets="manuscript.manuscript?.linkTargets ?? []"
      :points-here="panel.pointsHere.value"
      @open-link="panel.openLink"
    />
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
