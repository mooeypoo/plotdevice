<script setup lang="ts">
import { useManuscriptStore } from '../../app/manuscript-store'
import { useReferenceStore } from '../../app/reference-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { formatEntryPlaceLabel } from '../../shared/entry-place-label'
import RenderedMarkdown from '../../shared/RenderedMarkdown.vue'
import { isolate } from '../../shared/isolate'
import { usePeek } from '../../app/peek-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useReferencePanel } from './use-reference-panel'

const reference = useReferenceStore()
const manuscript = useManuscriptStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const panel = useReferencePanel()
const peek = usePeek()
const workbench = useWorkbenchStore()
const navigation = useWorkbenchNavigation()

/** Pinning keeps this entry as a card in the stack, so Reference stays free for the next lookup. */
function pin(path: string): void {
  workbench.pinCard(path)
  navigation.revealView('card-stack')
}
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
              : formatEntryPlaceLabel(reference.entry.label, language.t, chrome.formatNumber)
          }}
        </span>
        <button
          v-if="reference.path !== null && reference.entry !== null"
          type="button"
          class="quiet pin"
          :aria-pressed="workbench.cards.includes(reference.path)"
          :aria-label="language.t('cards-pin-label', isolate(reference.entry.title))"
          @click="pin(reference.path)"
        >
          {{ language.t('cards-pin') }}
        </button>
        <button
          v-if="reference.path !== null && reference.entry !== null"
          type="button"
          class="quiet beside"
          :aria-label="language.t('split-open-beside-label', isolate(reference.entry.title))"
          @click="navigation.openBeside(reference.path)"
        >
          {{ language.t('split-open-beside') }}
        </button>
        <button
          v-if="reference.entry !== null"
          type="button"
          class="quiet edit"
          @click="panel.edit()"
        >
          {{
            language.t(openInEditor ? 'reference-panel-show-editor' : 'reference-panel-open-editor')
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
        @peek="
          (link, near, byKeyboard) =>
            peek.peekLink(link, reference.path ?? undefined, near, byKeyboard)
        "
        @peek-end="peek.endHover()"
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
  padding: var(--space-5) var(--space-5) var(--space-7);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.edit,
.pin,
.beside {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-caption);
}
h2 {
  margin: var(--space-4) 0 var(--space-3);
  font-family: var(--font-prose);
  font-size: var(--text-heading);
  font-weight: 400;
  line-height: 1.25;
  color: var(--text-strong);
  overflow-wrap: anywhere;
}
.role {
  margin: 0 0 var(--space-3);
  color: var(--text-dim);
  line-height: 1.5;
}
.aliases {
  margin: 0 0 var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-small);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.file-path {
  display: block;
  overflow: hidden;
  margin-bottom: var(--space-6);
  color: var(--text-muted);
  font-size: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notice,
.empty p {
  margin: var(--space-4) 0;
  color: var(--text-muted);
  font-size: var(--text-small);
  line-height: 1.6;
}
.error {
  color: var(--danger);
}
.retry {
  padding: var(--space-1) var(--space-3);
  font-size: inherit;
}
.empty h2 {
  font-size: var(--text-heading);
}
</style>
