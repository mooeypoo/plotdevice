<script setup lang="ts">
import { computed } from 'vue'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import ChapterEditor from './ChapterEditor.vue'
import ConflictBanner from './ConflictBanner.vue'
import MissingFileBanner from './MissingFileBanner.vue'
import { useEditorLinks } from '../../app/use-editor-links'
import { usePeek } from '../../app/peek-store'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { formatEntryPlaceLabel, formatEntryPlaceTitle } from '../../shared/entry-place-label'
import { useChromePresentation } from '../../shared/use-chrome-presentation'

const manuscript = useManuscriptStore()
const editor = useEditorStore()
const workspace = useWorkspaceStore()
const workbench = useWorkbenchStore()
const tabs = useDocumentTabsStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()

const readOnly = computed(() => workspace.project?.readOnly ?? false)
const { completions, openLink, linkNotice } = useEditorLinks()
const peek = usePeek()
const linkTargets = computed(() => manuscript.manuscript?.linkTargets ?? [])
</script>

<template>
  <div v-if="editor.entry" class="page">
    <header class="heading">
      <div class="eyebrow" dir="auto">
        {{ formatEntryPlaceLabel(editor.entry.label, language.t, chrome.formatNumber) }}
      </div>
      <h1 dir="auto">{{ formatEntryPlaceTitle(editor.entry, language.t) }}</h1>
    </header>
    <!-- A quiet line about the page, such as who is in this chapter, placed by the stage. -->
    <slot name="under-heading" />

    <p v-if="readOnly" class="notice" role="status">
      {{ language.t('editor-read-only-notice') }}
    </p>
    <p v-else-if="editor.saveState === 'error'" class="notice error" role="alert">
      {{ editor.saveError }}
    </p>
    <p
      v-if="
        editor.recoveryError && editor.saveState !== 'missing' && editor.saveState !== 'conflict'
      "
      class="notice error"
      role="alert"
    >
      {{ editor.recoveryError }}
    </p>
    <MissingFileBanner
      v-if="editor.saveState === 'missing'"
      :kind="editor.entry.kind"
      :busy="editor.recoveryBusy"
      :read-only="readOnly"
      :error="editor.recoveryError"
      :recovered-path="editor.recoveredPath"
      :reappeared="editor.missingReappeared"
      @save-as-new="editor.saveMissingAsNew()"
      @discard="editor.discardMissing()"
      @load-theirs="editor.loadVersionOnDisk()"
    />
    <p v-if="linkNotice" class="notice" role="status">{{ linkNotice }}</p>
    <p v-if="editor.diskNotice" class="notice" role="status">
      {{ editor.diskNotice }}
    </p>
    <ConflictBanner
      v-if="editor.saveState === 'conflict'"
      :busy="editor.recoveryBusy"
      :read-only="readOnly"
      :error="editor.recoveryError"
      :recovered-path="editor.recoveredPath"
      @load-theirs="editor.loadVersionOnDisk()"
      @keep-mine="editor.keepMine()"
      @recover-copy="editor.saveMissingAsNew()"
    />

    <ChapterEditor
      :key="`${editor.entry.path}#${editor.entry.revision}`"
      :initial-text="editor.text"
      :document-id="tabs.documentId(editor.entry.path)"
      :read-only="readOnly || editor.recoveryBusy || editor.navigationBusy"
      :focus-mode="workbench.focusMode"
      :link-targets="linkTargets"
      :completions="completions"
      @change="editor.edit($event)"
      @blur="editor.flush()"
      @open-link="openLink"
      @peek="(link, near, byKeyboard) => peek.peekLink(link, editor.entry?.path, near, byKeyboard)"
      @peek-end="peek.endHover()"
    />
  </div>
  <!-- With no document open, the shell shows what belongs there (the project's home). -->
  <slot v-else />
</template>

<style scoped>
/* Measured in the prose font, so the heading column lines up with the text column exactly. */
.heading {
  max-width: var(--measure);
  margin: 0 auto var(--space-7);
  font-family: var(--font-prose);
  font-size: var(--prose-size);
}

.heading .eyebrow {
  font-family: var(--font-ui);
}

.focus .heading {
  opacity: 0.35;
  transition: opacity var(--duration-panel) var(--ease-out);
}

.focus .heading:hover {
  opacity: 1;
}

.eyebrow {
  letter-spacing: 0.14em;
}

h1 {
  margin: var(--space-3) 0 0;
  font-family: var(--font-prose);
  font-size: var(--text-display);
  font-weight: 400;
  line-height: 1.2;
  color: var(--text-strong);
}

.notice {
  max-width: calc(var(--measure) + var(--space-8));
  margin: 0 auto var(--space-6);
}
</style>
