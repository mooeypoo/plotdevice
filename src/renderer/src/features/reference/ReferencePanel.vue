<script setup lang="ts">
import { useManuscriptStore } from '../../app/manuscript-store'
import { useReferenceStore } from '../../app/reference-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { formatEntryPlaceLabel } from '../../shared/entry-place-label'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import { useReferencePanel } from './use-reference-panel'

const reference = useReferenceStore()
const manuscript = useManuscriptStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const panel = useReferencePanel()
const { text, profile, openInEditor, actionError, linkNotice } = panel
</script>

<template>
  <section
    ref="referenceScroller"
    class="reference-panel"
    :aria-label="language.t('reference-panel-label')"
    @scroll="panel.rememberScroll"
  >
    <template v-if="reference.path !== null">
      <header>
        <span class="eyebrow">
          {{
            reference.entry === null
              ? language.t('reference-panel-label')
              : formatEntryPlaceLabel(
                  reference.entry.label,
                  language.t,
                  chrome.formatNumber
                )
          }}
        </span>
        <button
          v-if="reference.entry !== null"
          type="button"
          class="quiet edit"
          @click="panel.edit()"
        >
          {{
            language.t(
              openInEditor ? 'reference-panel-show-editor' : 'reference-panel-open-editor'
            )
          }}
        </button>
      </header>
      <h2 dir="auto">{{ reference.entry?.title ?? reference.path }}</h2>
      <p v-if="profile?.role" class="role" dir="auto">{{ profile.role }}</p>
      <p v-if="profile && profile.aliases.length > 0" class="aliases">
        {{ language.t('reference-panel-aliases') }}
        <template v-for="(alias, index) in profile.aliases" :key="alias">
          <span v-if="index > 0">, </span><bdi>{{ alias }}</bdi>
        </template>
      </p>
      <span class="file-path" dir="auto" :title="reference.path">{{ reference.path }}</span>
      <p v-if="actionError" class="notice error" role="alert">{{ actionError }}</p>
      <p v-if="linkNotice" class="notice" role="status">{{ linkNotice }}</p>
      <p v-if="openInEditor" class="notice" role="status">
        {{ language.t('reference-panel-editor-draft') }}
      </p>
      <p v-if="reference.error" class="notice error" role="alert">
        {{ reference.error }}
        <button type="button" class="quiet retry" @click="reference.reload()">
          {{ language.t('reference-panel-retry') }}
        </button>
      </p>
      <p v-if="reference.loading && !openInEditor" class="notice" role="status">
        {{ language.t('reference-panel-loading') }}
      </p>
      <RenderedMarkdown
        v-else-if="text !== null"
        :key="reference.path"
        :text="text"
        :link-targets="manuscript.manuscript?.linkTargets ?? []"
        @open-link="panel.openLink"
      />
    </template>
    <div v-else class="empty">
      <h2>{{ language.t('reference-panel-empty-heading') }}</h2>
      <p>
        {{ language.t('reference-panel-empty-description') }}
      </p>
      <p>{{ language.t('reference-panel-empty-safety') }}</p>
    </div>
  </section>
</template>

<style scoped>
.reference-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 18px 40px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.edit {
  padding: 4px 6px;
  font-size: 11px;
}
h2 {
  margin: 12px 0 8px;
  font-family: var(--font-prose);
  font-size: 26px;
  font-weight: 400;
  line-height: 1.25;
  color: var(--text-strong);
  overflow-wrap: anywhere;
}
.role {
  margin: 0 0 8px;
  color: var(--text-dim);
  line-height: 1.5;
}
.aliases {
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.file-path {
  display: block;
  overflow: hidden;
  margin-bottom: 24px;
  color: var(--text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notice,
.empty p {
  margin: 12px 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}
.error {
  color: var(--danger);
}
.retry {
  padding: 2px 6px;
  font-size: inherit;
}
.empty h2 {
  font-size: 22px;
}
</style>
