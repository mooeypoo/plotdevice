<script setup lang="ts">
import { computed } from 'vue'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import SelectField from '../../shared/SelectField.vue'
import type { SelectOption } from '../../shared/select-option'
import { useOutlinePanel } from './use-outline-panel'
import { usePeek } from '../../app/peek-store'

const manuscript = useManuscriptStore()
const workspace = useWorkspaceStore()
const language = useUiLanguageStore()
const panel = useOutlinePanel()
const peek = usePeek()
const { outlines, path, text, openInEditor, loading, error, linkNotice } = panel

const outlineChoices = computed((): SelectOption[] =>
  outlines.value.map((outline) => ({
    value: outline.path,
    label: outline.title,
    title: outline.path
  }))
)
</script>

<template>
  <section class="outline" :aria-label="language.t('entry-place-outline')">
    <header>
      <SelectField
        v-if="outlines.length > 1"
        class="choose"
        size="small"
        :model-value="path ?? ''"
        :options="outlineChoices"
        :aria-label="language.t('outline-panel-select-label')"
        @update:model-value="panel.choose($event)"
      />
      <span v-else-if="outlines.length === 1" class="title" dir="auto">{{
        outlines[0]?.title
      }}</span>
      <button
        v-if="path !== null && !openInEditor"
        type="button"
        class="quiet small"
        @click="panel.edit()"
      >
        {{ language.t('codex-edit') }}
      </button>
    </header>
    <span v-if="path" class="file-path" dir="auto" :title="path">{{ path }}</span>
    <p v-if="linkNotice" class="empty" role="status">{{ linkNotice }}</p>

    <div v-if="outlines.length === 0" class="empty">
      <p>{{ language.t('outline-panel-empty-description') }}</p>
      <button
        v-if="!(workspace.project?.readOnly ?? false)"
        type="button"
        class="primary"
        @click="panel.create()"
      >
        {{ language.t('outline-panel-start') }}
      </button>
    </div>
    <template v-else-if="openInEditor">
      <p class="empty" role="status">{{ language.t('outline-panel-open-in-editor') }}</p>
      <RenderedMarkdown
        :text="text ?? ''"
        :link-targets="manuscript.manuscript?.linkTargets ?? []"
        :points-here="panel.pointsHere.value"
        @open-link="panel.openLink"
        @peek="(link, near, byKeyboard) => peek.peekLink(link, path ?? undefined, near, byKeyboard)"
        @peek-end="peek.endHover()"
      />
    </template>
    <p v-else-if="loading" class="loading" role="status">
      {{ language.t('outline-panel-loading') }}
    </p>
    <p v-else-if="error" class="empty error" role="alert">{{ error }}</p>
    <RenderedMarkdown
      v-else-if="text !== null"
      :text="text"
      :link-targets="manuscript.manuscript?.linkTargets ?? []"
      :points-here="panel.pointsHere.value"
      @open-link="panel.openLink"
      @peek="(link, near, byKeyboard) => peek.peekLink(link, path ?? undefined, near, byKeyboard)"
      @peek-end="peek.endHover()"
    />
  </section>
</template>

<style scoped>
.outline {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.title {
  font-weight: 600;
  color: var(--text-strong);
}

.choose {
  flex: 1;
  min-inline-size: 0;
}

.file-path {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error {
  color: var(--danger);
}

.empty {
  margin: 0;
  line-height: 1.5;
}

.empty p {
  margin: 0 0 var(--space-4);
}
</style>
