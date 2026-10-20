<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { createOutlineView, type OutlineView } from './outline-view'
import { useOutlinePanel } from './use-outline-panel'

const manuscript = useManuscriptStore()
const workspace = useWorkspaceStore()
const panel = useOutlinePanel()
const { outlines, path, text, openInEditor } = panel

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

onMounted(mount)
watch(host, mount)
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
watch(openInEditor, (open) => {
  // The host element goes away while the outline is in the main editor.
  if (open) {
    view?.destroy()
    view = undefined
  }
})

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
        <option v-for="outline in outlines" :key="outline.path" :value="outline.path">
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
    <div v-else ref="host" class="view"></div>
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
  padding: 4px 8px;
}

.small {
  padding: 4px 10px;
  font-size: 12px;
}

.view {
  font-size: 15px;
  /* The panel is narrow: smaller prose, and the outline's own lines, not the editor's measure. */
  --prose-size: 15px;
  --measure: 100%;
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
