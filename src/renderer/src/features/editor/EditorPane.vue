<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '../../app/layout-store'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import ProjectOverview from '../welcome/ProjectOverview.vue'
import ChapterEditor from './ChapterEditor.vue'
import ConflictBanner from './ConflictBanner.vue'
import MissingFileBanner from './MissingFileBanner.vue'
import { useEditorLinks } from './use-editor-links'

const manuscript = useManuscriptStore()
const editor = useEditorStore()
const workspace = useWorkspaceStore()
const layout = useLayoutStore()

const readOnly = computed(() => workspace.project?.readOnly ?? false)
const { completions, openLink, linkNotice } = useEditorLinks()
const linkTargets = computed(() => manuscript.manuscript?.linkTargets ?? [])
</script>

<template>
  <div class="pane" :class="{ focus: layout.focusMode }">
    <div v-if="editor.entry" class="page">
      <header class="heading">
        <div class="eyebrow" dir="auto">{{ editor.entry.label }}</div>
        <h1 dir="auto">{{ editor.entry.title }}</h1>
      </header>

      <p v-if="readOnly" class="notice" role="status">
        This project is open read-only, so Plot Device won’t change its files.
      </p>
      <p v-else-if="editor.saveState === 'error'" class="notice error" role="alert">
        {{ editor.saveError }}
      </p>
      <MissingFileBanner
        v-if="editor.saveState === 'missing'"
        :kind="editor.entry.kind"
        :busy="false"
        @save-as-new="editor.saveMissingAsNew()"
        @discard="editor.discardMissing()"
      />
      <p v-if="linkNotice" class="notice" role="status">{{ linkNotice }}</p>
      <p v-if="editor.diskNotice" class="notice" role="status">
        {{ editor.diskNotice }}
      </p>
      <ConflictBanner
        v-if="editor.saveState === 'conflict'"
        :busy="false"
        @load-theirs="editor.loadVersionOnDisk()"
        @keep-mine="editor.keepMine()"
      />

      <ChapterEditor
        :key="`${editor.entry.path}#${editor.entry.revision}`"
        :initial-text="editor.text"
        :read-only="readOnly"
        :focus-mode="layout.focusMode"
        :link-targets="linkTargets"
        :completions="completions"
        @change="editor.edit($event)"
        @blur="editor.flush()"
        @open-link="openLink"
      />
    </div>
    <ProjectOverview v-else />
  </div>
</template>

<style scoped>
.pane {
  height: 100%;
  overflow-y: auto;
  padding: 56px 40px 0;
  scroll-padding-bottom: 40vh;
}

.pane.focus {
  padding-top: 18vh;
  background: var(--bg-sunken);
}

/* Measured in the prose font, so the heading column lines up with the text column exactly. */
.heading {
  max-width: var(--measure);
  margin: 0 auto 30px;
  font-family: var(--font-prose);
  font-size: var(--prose-size);
}

.heading .eyebrow {
  font-family: var(--font-ui);
}

.focus .heading {
  opacity: 0.35;
  transition: opacity 200ms ease;
}

.focus .heading:hover {
  opacity: 1;
}

.eyebrow {
  letter-spacing: 0.14em;
}

h1 {
  margin: 6px 0 0;
  font-family: var(--font-prose);
  font-size: 36px;
  font-weight: 400;
  line-height: 1.2;
  color: var(--text-strong);
}

.notice {
  max-width: calc(var(--measure) + 48px);
  margin: 0 auto 28px;
  padding: 12px 18px;
  border-radius: 10px;
  background: var(--raised);
  color: var(--text-dim);
  line-height: 1.5;
}

.notice.error {
  background: rgba(227, 155, 123, 0.12);
  color: var(--text);
}
</style>
